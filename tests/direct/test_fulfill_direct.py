import json
import pytest

SOURCE = json.dumps([{"label":"primary","url":"https://example.com/status","authority":"PRIMARY","required":True}])
OUTCOMES = json.dumps([
    {"code":"FULFILLED","description":"met","payout_bps":0},
    {"code":"BREACHED","description":"breached","payout_bps":10000},
])

# Direct Mode's warp cheatcode patches datetime.now(), while Fulfill intentionally
# reads the transaction timestamp from gl.message_raw["datetime"]. Use a far-future
# policy window for valid creation tests instead of pretending warp changes that field.
FUTURE_START = 4102444800  # 2100-01-01T00:00:00Z
FUTURE_END = 4102448400
FUTURE_REVIEW = 4102448400
FUTURE_DEADLINE = 4102534800


def deploy(direct_deploy):
    return direct_deploy("contracts/fulfill.py")


def addr(contract, value):
    return type(contract._zero())(value)


def create(vm, contract, promisor, beneficiary, escrow=1000):
    promisor, beneficiary = addr(contract, promisor), addr(contract, beneficiary)
    vm.sender, vm.value = promisor, escrow
    contract.create_commitment(
        beneficiary,
        "Uptime",
        "Service remains available",
        FUTURE_START,
        FUTURE_END,
        FUTURE_REVIEW,
        FUTURE_DEADLINE,
        escrow,
        SOURCE,
        OUTCOMES,
    )


@pytest.mark.direct
def test_initial_counter_is_zero(direct_deploy):
    assert deploy(direct_deploy).get_commitment_counter() == 0


@pytest.mark.direct
def test_creation_persists_parties_and_accounting(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = deploy(direct_deploy)
    create(direct_vm, contract, direct_alice, direct_bob)
    record = contract.get_commitment(1)
    assert record.promisor == addr(contract, direct_alice)
    assert record.beneficiary == addr(contract, direct_bob)
    assert record.escrow_remaining == 1000
    assert contract.get_contract_accounting()["funded"] == 1000


@pytest.mark.direct
def test_creation_requires_exact_funding(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = deploy(direct_deploy)
    direct_vm.sender, direct_vm.value = addr(contract, direct_alice), 999
    with pytest.raises(AssertionError):
        contract.create_commitment(
            addr(contract, direct_bob), "x", "y",
            FUTURE_START, FUTURE_END, FUTURE_REVIEW, FUTURE_DEADLINE,
            1000, SOURCE, OUTCOMES,
        )


@pytest.mark.direct
def test_promisor_cannot_be_beneficiary(direct_vm, direct_deploy, direct_alice):
    contract = deploy(direct_deploy)
    direct_vm.sender, direct_vm.value = addr(contract, direct_alice), 1000
    with pytest.raises(AssertionError):
        contract.create_commitment(
            addr(contract, direct_alice), "x", "y",
            FUTURE_START, FUTURE_END, FUTURE_REVIEW, FUTURE_DEADLINE,
            1000, SOURCE, OUTCOMES,
        )


@pytest.mark.direct
def test_known_past_performance_cannot_be_backfilled(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = deploy(direct_deploy)
    direct_vm.sender, direct_vm.value = addr(contract, direct_alice), 1000
    with pytest.raises(AssertionError):
        contract.create_commitment(
            addr(contract, direct_bob), "Past event", "Already known",
            100, 150, 150, 300,
            1000, SOURCE, OUTCOMES,
        )


@pytest.mark.direct
def test_open_review_requires_beneficiary(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = deploy(direct_deploy)
    create(direct_vm, contract, direct_alice, direct_bob)
    direct_vm.sender = addr(contract, direct_alice)
    with pytest.raises(AssertionError):
        contract.open_review(1)
    assert contract.status_label(1) == "ACTIVE"


@pytest.mark.direct
def test_list_reads_are_bounded(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = deploy(direct_deploy)
    create(direct_vm, contract, direct_alice, direct_bob)
    assert len(contract.list_commitments(1, 25)) == 1
    with pytest.raises(AssertionError):
        contract.list_commitments(1, 26)


@pytest.mark.direct
def test_reclaim_expired_is_time_guarded(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = deploy(direct_deploy)
    create(direct_vm, contract, direct_alice, direct_bob)
    direct_vm.sender = addr(contract, direct_alice)
    with pytest.raises(AssertionError):
        contract.reclaim_expired(1)
    assert contract.status_label(1) == "ACTIVE"
    assert contract.get_commitment_accounting(1)["escrow_remaining"] == 1000


@pytest.mark.direct
def test_constants_expose_limits(direct_deploy):
    constants = deploy(direct_deploy).get_constants()
    assert constants["max_primary_attempts"] == 8
    assert constants["challenge_bond_bps"] == 500
    assert constants["max_page_size"] == 25
