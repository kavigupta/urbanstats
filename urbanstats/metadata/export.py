import re

from .metadata_column import DisplayedMetadata, ExternalLinkMetadata
from .metadata_list import metadata_types


def default_setting_key(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")
    return f"show_metadata_{slug}"


def export_metadata_types():
    displayed_metadata = []
    external_link_metadata = []
    for i, v in enumerate(metadata_types.values()):
        if isinstance(v, DisplayedMetadata):
            setting_key = v.setting_key or default_setting_key(v.name)
            displayed_metadata.append(
                dict(
                    index=i,
                    name=v.name,
                    setting_key=setting_key,
                    show_in_metadata_table=v.show_in_metadata_table,
                    value_kind=v.value_kind,
                    category=v.category,
                    data_credit_explanation_page=v.data_credit_explanation_page,
                )
            )
        elif isinstance(v, ExternalLinkMetadata):
            external_link_metadata.append(
                dict(
                    index=i,
                    site=v.site,
                    link_prefix=v.link_prefix,
                    normalizer=v.normalizer,
                    show_in_metadata_table=v.show_in_metadata_table,
                )
            )
        else:
            raise ValueError(f"Unknown metadata type: {type(v)}")
    return {
        "displayed_metadata": displayed_metadata,
        "external_link_metadata": external_link_metadata,
    }
