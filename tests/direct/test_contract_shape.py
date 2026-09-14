from pathlib import Path

SOURCE = Path("contracts/fulfill.py").read_text(encoding="utf-8")


def test_contract_is_named_for_product():
    assert "class Fulfill(gl.Contract):" in SOURCE


def test_financial_settlement_is_not_llm_selected():
    assert "payout = commitment.escrow_total * u256(bps) // u256(10000)" in SOURCE
    assert "Allowed labels:" in SOURCE


def test_bounded_failure_paths_exist():
    for method in ["finalize_unresolved", "finalize_stalled_challenge", "reclaim_expired"]:
        assert f"def {method}" in SOURCE


def test_public_source_policy_is_explicit():
    assert "at least one required PRIMARY source is required" in SOURCE
    assert "source must be a public https URL" in SOURCE
