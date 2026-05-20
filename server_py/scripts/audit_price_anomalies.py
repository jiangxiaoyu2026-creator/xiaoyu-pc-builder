"""
Audit hardware price anomalies.

Default mode is read-only. Use explicit flags to clean public-product fields or
delete invalid PriceHistory rows after reviewing the output.
"""

import argparse
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from sqlmodel import Session, select

from server_py.db import engine
from server_py.models import Hardware, PriceHistory
from server_py.services.price_safety import has_valid_previous_price, is_valid_price_history_change


def _product_name(product: Hardware) -> str:
    return f"{product.category} | {product.brand} {product.model}".strip()


def _print_items(title: str, items: list, formatter, limit: int):
    print(f"\n{title}: {len(items)}")
    for item in items[:limit]:
        print(f"  - {formatter(item)}")
    if len(items) > limit:
        print(f"  ... 还有 {len(items) - limit} 条未显示")


def _history_ratio(change: PriceHistory) -> str:
    old_price = change.oldPrice or 0
    new_price = change.newPrice or 0
    if old_price <= 0 or new_price <= 0:
        return "invalid"
    return f"{max(old_price, new_price) / min(old_price, new_price):.2f}x"


def audit(limit: int, fix_public_products: bool, delete_invalid_history: bool):
    with Session(engine) as session:
        active_products = session.exec(
            select(Hardware).where(Hardware.status == "active")
        ).all()
        active_zero_products = [
            p for p in active_products
            if p.price is None or p.price <= 0
        ]
        bad_previous_products = [
            p for p in active_products
            if not has_valid_previous_price(p.price, p.previousPrice)
        ]

        history_rows = session.exec(select(PriceHistory)).all()
        invalid_history_rows = [
            h for h in history_rows
            if not is_valid_price_history_change(h.oldPrice, h.newPrice)
        ]

        _print_items(
            "active 但 price<=0 的商品",
            active_zero_products,
            lambda p: f"{p.id} | {_product_name(p)} | price={p.price}",
            limit,
        )
        _print_items(
            "previousPrice 与当前价倍率异常的商品",
            bad_previous_products,
            lambda p: f"{p.id} | {_product_name(p)} | price={p.price} previousPrice={p.previousPrice}",
            limit,
        )
        _print_items(
            "异常 PriceHistory",
            invalid_history_rows,
            lambda h: (
                f"{h.id} | {h.category} | {h.hardwareName} | "
                f"{h.oldPrice}->{h.newPrice} | ratio={_history_ratio(h)} | {h.changedAt}"
            ),
            limit,
        )

        changed = False
        if fix_public_products:
            for product in active_zero_products:
                product.status = "archived"
                session.add(product)
            for product in bad_previous_products:
                product.previousPrice = None
                session.add(product)
            changed = bool(active_zero_products or bad_previous_products)

        if delete_invalid_history:
            for row in invalid_history_rows:
                session.delete(row)
            changed = changed or bool(invalid_history_rows)

        if changed:
            session.commit()
            print("\n已提交清理。")
        else:
            print("\n只读巡检完成，未写入数据库。")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="巡检硬件价格异常")
    parser.add_argument("--limit", type=int, default=50, help="每类最多显示多少条")
    parser.add_argument(
        "--fix-public-products",
        action="store_true",
        help="归档 active price<=0 商品，并清空倍率异常的 previousPrice",
    )
    parser.add_argument(
        "--delete-invalid-history",
        action="store_true",
        help="删除 old/new<=0 或倍率超过 3x 的 PriceHistory 记录",
    )
    args = parser.parse_args()
    audit(
        limit=args.limit,
        fix_public_products=args.fix_public_products,
        delete_invalid_history=args.delete_invalid_history,
    )
