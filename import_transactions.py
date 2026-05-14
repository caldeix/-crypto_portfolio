#!/usr/bin/env python3
"""
Reads transacciones.txt (tab-separated, Spanish number format).

- BUY/SELL rows for crypto symbols  → appended as crypto transactions
- GAMBLING/VIVIR/FUTUROS rows       → appended as expense transactions
  · RETIRADO  = positive totalUSD  (outflow, reduces P&L)
  · RECUPERADO = negative totalUSD (inflow, increases P&L)

Processed lines are removed from the source file.

Run: python import_transactions.py
"""

import json
import uuid
import os
from datetime import datetime, timezone

SRC_FILE = os.path.join(os.path.dirname(__file__), "transacciones.txt")
DST_FILE = os.path.join(os.path.dirname(__file__), "portfolio_config_2026-05-13.json")

# Symbols that are truly not crypto and not expense categories either
SKIP_SYMBOLS = {"DESCUADRE", ""}

# Expense category symbols → stored as expense transactions (no crypto)
EXPENSE_SYMBOLS = {"GAMBLING", "VIVIR", "FUTUROS"}

# CoinGecko ID map
CGID_MAP = {
    "ETH":    "ethereum",
    "BTC":    "bitcoin",
    "SOL":    "solana",
    "MINI":   "minimini",
    "IOTA":   "iota",
    "HBAR":   "hedera-hashgraph",
    "DOT":    "polkadot",
    "SUI":    "sui",
    "STRK":   "starknet",
    "ROSE":   "oasis-network",
    "ALI":    "alethea-artificial-liquid-intelligence-token",
    "LBR":    "lybra-finance",
    "BEAM":   "beam",
    "METAL":  "metal",
    "NOM":    "nomic",
    "VEGA":   "vega-protocol",
    "POPCAT": "popcat",
    "JUP":    "jupiter-exchange-solana",
    "WIF":    "dogwifcoin",
    "FET":    "fetch-ai",
    "STG":    "stargate-finance",
    "HYPE":   "hyperliquid",
    "RAIL":   "railgun",
    "AURA":   "aura-network",
    "TURBOS": "turbos-finance",
    "BLUB":   "blub",
    "SPX":    "spx6900",
    "MELANIA": "melania-meme",
    # Unknown cgId — stored anyway
    "WDOG":   None,
    "BOB":    None,
    "SELFIE": None,
    "MUSK":   None,
    "LIBRA":  None,
    "NMT":    None,
    "ASTER":  None,
    "CDL":    None,
    "GPU":    None,
    "LITT":   None,
    "HSUITE": None,
}


def parse_num(s: str) -> float:
    s = s.strip().replace(" $", "").replace("$", "")
    s = s.replace(".", "").replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return 0.0


def parse_date(s: str) -> str:
    day, month, year = s.strip().split("/")
    dt = datetime(int(year), int(month), int(day), 12, 0, 0, tzinfo=timezone.utc)
    return dt.strftime("%Y-%m-%dT%H:%M:%S.000Z")


def gen_id() -> str:
    return uuid.uuid4().hex[:12]


def load_portfolio(path: str) -> dict:
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {
        "version": 2,
        "exportedAt": "",
        "transactions": [],
        "customCategories": [],
        "expenseCategories": [],
        "archivedSymbols": [],
    }


def save_portfolio(path: str, data: dict) -> None:
    data["exportedAt"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def main():
    with open(SRC_FILE, "r", encoding="utf-8") as f:
        lines = f.readlines()

    portfolio = load_portfolio(DST_FILE)
    existing_txs = portfolio.setdefault("transactions", [])

    # Ensure expense categories are registered
    expense_cats = portfolio.setdefault("expenseCategories", [])
    custom_cats  = portfolio.setdefault("customCategories", [])
    for cat in EXPENSE_SYMBOLS:
        if cat not in custom_cats:
            custom_cats.append(cat)
        if cat not in expense_cats:
            expense_cats.append(cat)

    processed = set()
    added_crypto = 0
    added_expense = 0
    skipped = 0

    for i, raw in enumerate(lines):
        line = raw.rstrip("\n")
        parts = line.split("\t")
        if len(parts) < 7:
            continue

        raw_action = parts[0].strip().upper()
        fecha  = parts[1].strip()
        symbol = parts[4].strip().upper()
        lugar  = parts[5].strip()
        total  = parts[6].strip()

        if not fecha or "/" not in fecha:
            continue
        if symbol in SKIP_SYMBOLS:
            skipped += 1
            continue

        # ── Expense rows ─────────────────────────────────────────────────
        if symbol in EXPENSE_SYMBOLS or raw_action in EXPENSE_SYMBOLS:
            total_usd = parse_num(total)
            if total_usd == 0.0:
                skipped += 1
                continue
            try:
                date_iso = parse_date(fecha)
            except Exception:
                skipped += 1
                continue

            cat = symbol if symbol in EXPENSE_SYMBOLS else raw_action
            # RECUPERADO → money recovered → negative (reduces net gastos)
            if "RECUPERADO" in lugar.upper():
                total_usd = -abs(total_usd)
            else:
                total_usd = abs(total_usd)

            tx = {
                "id":       gen_id(),
                "cgId":     None,
                "cryptoId": None,
                "symbol":   cat,
                "name":     cat,
                "category": cat,
                "date":     date_iso,
                "amount":   0,
                "priceUSD": 1,
                "totalUSD": total_usd,
                "notes":    lugar,
            }
            existing_txs.append(tx)
            processed.add(i)
            added_expense += 1
            continue

        # ── Crypto BUY / SELL rows ────────────────────────────────────────
        if raw_action not in ("BUY", "SELL"):
            continue

        cantidad = parts[2].strip()
        precio   = parts[3].strip()
        amount    = parse_num(cantidad)
        price     = parse_num(precio)
        total_usd = parse_num(total)

        if total_usd == 0.0 and amount > 0 and price > 0:
            total_usd = round(amount * price, 6)
        if total_usd == 0.0 and amount == 0.0:
            skipped += 1
            continue

        try:
            date_iso = parse_date(fecha)
        except Exception:
            print(f"  [WARN] bad date '{fecha}' line {i+1}")
            skipped += 1
            continue

        tx = {
            "id":       gen_id(),
            "cgId":     CGID_MAP.get(symbol, None),
            "cryptoId": None,
            "symbol":   symbol,
            "name":     symbol,
            "category": raw_action,
            "date":     date_iso,
            "amount":   amount,
            "priceUSD": price,
            "totalUSD": total_usd,
            "notes":    lugar,
        }
        existing_txs.append(tx)
        processed.add(i)
        added_crypto += 1

    if added_crypto + added_expense == 0:
        print("Nothing new to import.")
        return

    save_portfolio(DST_FILE, portfolio)
    print(f"Crypto transactions added : {added_crypto}")
    print(f"Expense transactions added: {added_expense}")
    if skipped:
        print(f"Skipped                   : {skipped}")

    remaining = [l for i, l in enumerate(lines) if i not in processed]
    with open(SRC_FILE, "w", encoding="utf-8") as f:
        f.writelines(remaining)
    print(f"Removed {len(processed)} lines from {os.path.basename(SRC_FILE)}.")


if __name__ == "__main__":
    main()
