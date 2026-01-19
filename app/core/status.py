def classify(
    *,
    in_register: bool,
    in_catalog: bool,
    in_all_gtins: bool,
    uploaded_catalog: bool,
    uploaded_register: bool,
) -> str:
    if in_register and in_catalog and uploaded_catalog and uploaded_register:
        return "green"

    if in_register and (not uploaded_catalog or not uploaded_register):
        return "yellow"

    if in_all_gtins and not in_register:
        return "orange"

    return "red"
