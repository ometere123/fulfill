import json
import pytest

SOURCE = json.dumps([{"label":"primary","url":"https://example.com/status","authority":"PRIMARY","required":True}])
OUTCOMES = json.dumps([
    {"code":"FULFILLED","description":"met","payout_bps":0},
    {"code":"BREACHED","description":"breached","payout_bps":10000},
])


def deploy(direct_deploy):
    return direct_deploy("contracts/fulfill.py")


def addr(contract, value):
    return type(contract._zero())(value)


def create(vm, contract, promisor, beneficiary, escrow=1000):
    promisor, beneficiary = addr(contract, promisor), addr(contract, beneficiary)
    vm.warp("1970-01-01T00:00:01Z")
    vm.sender, vm.value = promisor, escrow
    contract.create_commitment(beneficiary, "Uptime", "Service remains available", 0, 100, 100, 200, escrow, SOURCE, OUTCOMES)


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
        contract.create_commitment(addr(contract, direct_bob), "x", "y", 0, 100, 100, 200, 1000, SOURCE, OUTCOMES)


@pytest.mark.direct
def test_promisor_cannot_be_beneficiary(direct_vm, direct_deploy, direct_alice):
    contract = deploy(direct_deploy)
    direct_vm.sender, direct_vm.value = addr(contract, direct_alice), 1000
    with pytest.raises(AssertionError):
        contract.create_commitment(addr(contract, direct_alice), "x", "y", 0, 100, 100, 200, 1000, SOURCE, OUTCOMES)


@pytest.mark.direct
def test_open_review_requires_beneficiary(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = deploy(direct_deploy)
    create(direct_vm, contract, direct_alice, direct_bob)
    direct_vm.warp("1970-01-01T00:01:41Z")
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
def test_expiry_returns_escrow(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = deploy(direct_deploy)
    create(direct_vm, contract, direct_alice, direct_bob)
    direct_vm.sender = addr(contract, direct_alice)
    direct_vm.warp("1970-01-01T00:03:21Z")
    contract.reclaim_expired(1)
    assert contract.status_label(1) == "EXPIRED_RETURNED"
    assert contract.get_commitment_accounting(1)["escrow_remaining"] == 0


@pytest.mark.direct
def test_constants_expose_limits(direct_deploy):
    constants = deploy(direct_deploy).get_constants()
    assert constants["max_primary_attempts"] == 8
    assert constants["challenge_bond_bps"] == 500
    assert constants["max_page_size"] == 25
