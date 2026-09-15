import json
import pytest

SOURCES = json.dumps([
    {"id":"SOURCE_A","label":"operational record","url":"https://example.com/status"},
    {"id":"SOURCE_B","label":"independent report","url":"https://example.org/report"},
])
CHECKS = json.dumps([
    {"id":"CHECK_A","requirement":"delivery completed by deadline","weight_bps":6000,"source_ids":["SOURCE_A"],"min_available":1},
    {"id":"CHECK_B","requirement":"quality threshold was met","weight_bps":4000,"source_ids":["SOURCE_A","SOURCE_B"],"min_available":1},
])

# Direct Mode warp patches datetime.now(), while Fulfill intentionally reads the
# transaction timestamp from gl.message_raw["datetime"]. Use a future window.
FUTURE_START = 4102444800
FUTURE_END = 4102448400
FUTURE_ASSESS = 4102448400
FUTURE_DEADLINE = 4102534800


def deploy(direct_deploy):
    return direct_deploy("contracts/fulfill.py")


def addr(contract, value):
    return type(contract._zero())(value)


def create(vm, contract, funder, recipient, escrow=1000):
    funder, recipient = addr(contract, funder), addr(contract, recipient)
    vm.sender, vm.value = funder, escrow
    contract.create_commitment(
        recipient,
        "Fulfilment batch",
        "Complete the funded performance scorecard",
        FUTURE_START,
        FUTURE_END,
        FUTURE_ASSESS,
        FUTURE_DEADLINE,
        escrow,
        SOURCES,
        CHECKS,
    )


@pytest.mark.direct
def test_initial_counter_is_zero(direct_deploy):
    assert deploy(direct_deploy).get_commitment_counter() == 0


@pytest.mark.direct
def test_creation_persists_roles_scorecard_and_accounting(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = deploy(direct_deploy)
    create(direct_vm, contract, direct_alice, direct_bob)
    record = contract.get_commitment(1)
    assert record.funder == addr(contract, direct_alice)
    assert record.recipient == addr(contract, direct_bob)
    assert record.escrow_remaining == 1000
    assert contract.get_check(1, 0)["weight_bps"] == 6000
    assert contract.get_source(1, 1)["id"] == "SOURCE_B"
    assert contract.get_contract_accounting()["funded"] == 1000


@pytest.mark.direct
def test_creation_normalizes_raw_hex_recipient_string(direct_vm, direct_deploy, direct_alice):
    contract = deploy(direct_deploy)
    raw_recipient = "0x81301DD9C3605a7DA743D87b803156d8445620B0"
    funder = addr(contract, direct_alice)
    direct_vm.sender, direct_vm.value = funder, 1000

    contract.create_commitment(
        raw_recipient,
        "Raw recipient boundary",
        "Persist an externally supplied recipient safely",
        FUTURE_START,
        FUTURE_END,
        FUTURE_ASSESS,
        FUTURE_DEADLINE,
        1000,
        SOURCES,
        CHECKS,
    )

    assert contract.get_commitment(1).recipient == addr(contract, raw_recipient)


@pytest.mark.direct
def test_creation_requires_exact_funding(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = deploy(direct_deploy)
    direct_vm.sender, direct_vm.value = addr(contract, direct_alice), 999
    with pytest.raises(AssertionError):
        contract.create_commitment(
            addr(contract, direct_bob), "x", "y",
            FUTURE_START, FUTURE_END, FUTURE_ASSESS, FUTURE_DEADLINE,
            1000, SOURCES, CHECKS,
        )


@pytest.mark.direct
def test_funder_cannot_be_recipient(direct_vm, direct_deploy, direct_alice):
    contract = deploy(direct_deploy)
    direct_vm.sender, direct_vm.value = addr(contract, direct_alice), 1000
    with pytest.raises(AssertionError):
        contract.create_commitment(
            addr(contract, direct_alice), "x", "y",
            FUTURE_START, FUTURE_END, FUTURE_ASSESS, FUTURE_DEADLINE,
            1000, SOURCES, CHECKS,
        )


@pytest.mark.direct
def test_known_past_performance_cannot_be_backfilled(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = deploy(direct_deploy)
    direct_vm.sender, direct_vm.value = addr(contract, direct_alice), 1000
    with pytest.raises(AssertionError):
        contract.create_commitment(
            addr(contract, direct_bob), "Past event", "Already known",
            100, 150, 150, 300,
            1000, SOURCES, CHECKS,
        )


@pytest.mark.direct
def test_request_assessment_requires_recipient(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = deploy(direct_deploy)
    create(direct_vm, contract, direct_alice, direct_bob)
    direct_vm.sender = addr(contract, direct_alice)
    with pytest.raises(AssertionError):
        contract.request_assessment(1)
    assert contract.status_label(1) == "LOCKED"


@pytest.mark.direct
def test_weights_must_total_ten_thousand(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = deploy(direct_deploy)
    bad_checks = json.dumps([
        {"id":"CHECK_A","requirement":"one","weight_bps":5000,"source_ids":["SOURCE_A"],"min_available":1},
        {"id":"CHECK_B","requirement":"two","weight_bps":4000,"source_ids":["SOURCE_B"],"min_available":1},
    ])
    direct_vm.sender, direct_vm.value = addr(contract, direct_alice), 1000
    with pytest.raises(AssertionError):
        contract.create_commitment(
            addr(contract, direct_bob), "x", "y",
            FUTURE_START, FUTURE_END, FUTURE_ASSESS, FUTURE_DEADLINE,
            1000, SOURCES, bad_checks,
        )


@pytest.mark.direct
def test_check_cannot_reference_unknown_source(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = deploy(direct_deploy)
    bad_checks = json.dumps([
        {"id":"CHECK_A","requirement":"one","weight_bps":10000,"source_ids":["MISSING"],"min_available":1},
    ])
    direct_vm.sender, direct_vm.value = addr(contract, direct_alice), 1000
    with pytest.raises(AssertionError):
        contract.create_commitment(
            addr(contract, direct_bob), "x", "y",
            FUTURE_START, FUTURE_END, FUTURE_ASSESS, FUTURE_DEADLINE,
            1000, SOURCES, bad_checks,
        )


@pytest.mark.direct
def test_contest_bond_is_proportional_to_disputed_weight(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = deploy(direct_deploy)
    create(direct_vm, contract, direct_alice, direct_bob)
    assert contract.quote_contest_bond(1, json.dumps(["CHECK_B"])) == 20
    assert contract.quote_contest_bond(1, json.dumps(["CHECK_A", "CHECK_B"])) == 50


@pytest.mark.direct
def test_list_reads_are_bounded(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = deploy(direct_deploy)
    create(direct_vm, contract, direct_alice, direct_bob)
    assert len(contract.list_commitments(1, 25)) == 1
    with pytest.raises(AssertionError):
        contract.list_commitments(1, 26)


@pytest.mark.direct
def test_recover_unclaimed_is_time_guarded(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = deploy(direct_deploy)
    create(direct_vm, contract, direct_alice, direct_bob)
    direct_vm.sender = addr(contract, direct_alice)
    with pytest.raises(AssertionError):
        contract.recover_unclaimed(1)
    assert contract.status_label(1) == "LOCKED"
    assert contract.get_commitment_accounting(1)["escrow_remaining"] == 1000


@pytest.mark.direct
def test_constants_expose_scorecard_limits(direct_deploy):
    constants = deploy(direct_deploy).get_constants()
    assert constants["policy_version"] == "FULFILL_SCORECARD_V2"
    assert constants["max_assessment_attempts"] == 8
    assert constants["contest_bond_bps"] == 500
    assert constants["max_checks"] == 8
    assert constants["max_page_size"] == 25


@pytest.mark.direct
@pytest.mark.parametrize("results", [
    [{"check_id": "CHECK_A", "result": "SATISFIED"}, {"check_id": "CHECK_A", "result": "NOT_SATISFIED"}],
    [{"check_id": "CHECK_A", "result": "SATISFIED"}],
    [{"check_id": "CHECK_A", "result": "SATISFIED"}, {"check_id": "CHECK_C", "result": "SATISFIED"}],
    [{"check_id": "CHECK_A", "result": "MAYBE"}, {"check_id": "CHECK_B", "result": "SATISFIED"}],
])
def test_assessment_results_reject_malformed_scorecard(direct_vm, direct_deploy, direct_alice, direct_bob, results):
    contract = deploy(direct_deploy)
    create(direct_vm, contract, direct_alice, direct_bob)
    with pytest.raises(AssertionError):
        contract._score_results(contract.get_commitment(1), json.dumps(results))


@pytest.mark.direct
def test_assessment_results_accept_reordered_equivalent_scorecard(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = deploy(direct_deploy)
    create(direct_vm, contract, direct_alice, direct_bob)
    results = [
        {"check_id": "CHECK_B", "result": "SATISFIED"},
        {"check_id": "CHECK_A", "result": "NOT_SATISFIED"},
    ]
    assert contract._score_results(contract.get_commitment(1), json.dumps(results)) == [4000, 0]


@pytest.mark.direct
def test_contest_results_must_match_selected_check_scope(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = deploy(direct_deploy)
    create(direct_vm, contract, direct_alice, direct_bob)
    commitment = contract.get_commitment(1)
    selected = json.dumps(["CHECK_B"])
    valid = [{"check_id": "CHECK_B", "result": "UNRESOLVED"}]
    assert contract._score_results(commitment, json.dumps(valid), selected) == [0, 1]
    with pytest.raises(AssertionError):
        contract._score_results(commitment, json.dumps(valid + [{"check_id": "CHECK_A", "result": "SATISFIED"}]), selected)
