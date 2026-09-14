from pathlib import Path

SOURCE = Path("contracts/fulfill.py").read_text(encoding="utf-8")


def test_contract_is_named_for_product():
    assert "class Fulfill(gl.Contract):" in SOURCE


def test_financial_settlement_is_not_llm_selected():
    assert "payout = commitment.escrow_total * u256(bps) // u256(10000)" in SOURCE
    assert "SATISFIED, NOT_SATISFIED, or UNRESOLVED" in SOURCE


def test_scorecard_is_weighted_and_scoped():
    assert '"weight_bps"' in SOURCE
    assert '"source_ids"' in SOURCE
    assert 'check weights must total 10000 bps' in SOURCE
    assert "def _disputed_weight_bps" in SOURCE


def test_contest_is_check_scoped_not_global():
    assert "def contest_checks" in SOURCE
    assert "contest_scope" in SOURCE
    assert "quote_contest_bond" in SOURCE


def test_bounded_failure_paths_exist():
    for method in ["recover_unresolved", "finalize_stalled_contest", "recover_unclaimed"]:
        assert f"def {method}" in SOURCE


def test_public_source_policy_is_explicit():
    assert "source must be a public https URL" in SOURCE
    assert "source id is not part of the frozen catalogue" in SOURCE


def test_old_whole_verdict_model_is_gone():
    for legacy in ["outcome_rules_json", "PRIMARY", "CORROBORATING", "challenge_result", "provisional_code"]:
        assert legacy not in SOURCE
