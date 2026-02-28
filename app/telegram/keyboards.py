def category_keyboard(categories: list[str]):
    # Build rows of 2, last row gets the remainder
    rows = [categories[i:i+2] for i in range(0, len(categories), 2)]
    return {
        "keyboard": rows,
        "resize_keyboard": True,
        "one_time_keyboard": False,
    }
