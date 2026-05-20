PRICE_CHANGE_THRESHOLD = 0.30
MAX_HISTORY_PRICE_RATIO = 3.0


class PriceSafetyError(ValueError):
    pass


def _positive_float(value) -> float:
    if value is None:
        return 0.0
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return 0.0
    return parsed if parsed > 0 else 0.0


def has_valid_previous_price(price, previous_price, max_ratio: float = MAX_HISTORY_PRICE_RATIO) -> bool:
    current = _positive_float(price)
    previous = _positive_float(previous_price)
    if current <= 0 or previous <= 0:
        return True
    return max(current, previous) / min(current, previous) <= max_ratio


def sanitize_previous_price(price, previous_price):
    return previous_price if has_valid_previous_price(price, previous_price) else None


def is_valid_price_history_change(old_price, new_price, max_ratio: float = MAX_HISTORY_PRICE_RATIO) -> bool:
    old = _positive_float(old_price)
    new = _positive_float(new_price)
    if old <= 0 or new <= 0:
        return False
    return max(old, new) / min(old, new) <= max_ratio


def validate_price_change(old_price, new_price, force: bool = False, threshold: float = PRICE_CHANGE_THRESHOLD):
    if old_price == new_price or old_price is None:
        return
    if new_price is None:
        raise PriceSafetyError("价格不能为空")

    old = float(old_price)
    new = float(new_price)
    if force:
        return
    if old > 0 and new <= 0:
        raise PriceSafetyError("价格从有效值变为 0，请改用下架状态；如确需写入 0 元，请使用 force_price_update")
    if old > 0 and new > 0:
        change_pct = abs(new - old) / old
        if change_pct > threshold:
            raise PriceSafetyError(f"价格变动 {change_pct * 100:.1f}% 超过 30% 安全阈值，请核对后使用 force_price_update")
