# Deployment handoff

Target environment: GenLayer Studionet, chain ID `61999`.

The repository intentionally contains no deployment address or fabricated transaction evidence. The deployment agent should:

1. install dependencies and run every contract/web verification command from `docs/TESTING.md`
2. validate the contract with the current GenLayer CLI or Studio tooling
3. deploy `contracts/fulfill.py` to Studionet `61999` from the funded owner wallet
4. record contract address, deployment transaction and source commit
5. set `VITE_FULFILL_CONTRACT_ADDRESS` for the frontend
6. run live creation, review, evaluation, challenge/finalisation and expiry/recovery scenarios where time permits
7. report success only after a final accepted receipt and a confirming state read
8. write real evidence only into `LIVE_EVIDENCE.md`; never invent hashes, addresses or successful states
9. deploy the web app and verify the connected wallet is on chain `61999`

Do not change the target network unless the owner explicitly changes the requirement.
