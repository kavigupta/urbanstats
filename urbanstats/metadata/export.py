from .metadata_column import DisplayedMetadata, ExternalLinkMetadata
from .metadata_list import metadata_types


def export_metadata_types():
    displayed_metadata = []
    external_link_metadata = []
    for i, v in enumerate(metadata_types.values()):
        if isinstance(v, DisplayedMetadata):
            displayed_metadata.append({"index": i, **v.export()})
        elif isinstance(v, ExternalLinkMetadata):
            external_link_metadata.append({"index": i, **v.export()})
        else:
            raise ValueError(f"Unknown metadata type: {type(v)}")
    return {
        "displayed_metadata": displayed_metadata,
        "external_link_metadata": external_link_metadata,
    }
