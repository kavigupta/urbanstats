import pickle
from permacache import permacache, swap_unpickler_context_manager
MODULE_RENAME_MAP = {
    "pandas.core.indexes.numeric": "urbanstats.compatibility.pandas_numeric_stub",
}

SYMBOL_RENAME_MAP = {}

class renamed_symbol_unpickler(pickle.Unpickler):
    """
    Unpicler that renames modules and symbols as specified in the
    MODULE_RENAME_MAP and SYMBOL_RENAME_MAP dictionaries.
    """

    def find_class(self, module, name):
        if (module, name) in SYMBOL_RENAME_MAP:
            assert module not in MODULE_RENAME_MAP
            module, name = SYMBOL_RENAME_MAP[(module, name)]
            assert module not in MODULE_RENAME_MAP
        if module in MODULE_RENAME_MAP:
            module = MODULE_RENAME_MAP[module]

        try:
            return super(renamed_symbol_unpickler, self).find_class(module, name)
        except:
            print("Could not find", (module, name))
            raise


class remapping_pickle:
    """
    An instance of this class will behave like the pickle module, but
    will use the renamed_symbol_unpickler class instead of the default
    Unpickler class.
    """

    def __getattribute__(self, name):
        if name == "Unpickler":
            return renamed_symbol_unpickler
        return getattr(pickle, name)

    def __hasattr__(self, name):
        return hasattr(pickle, name)


def load_with_remapping_pickle(*args, **kwargs):
    """
    Behaves like torch.load, but re-maps modules.
    """
    import torch

    return torch.load(*args, **kwargs, pickle_module=remapping_pickle())


def permacache_with_remapping_pickle(*args, **kwargs):
    """
    Behaves like permacache.permacache, but re-maps modules on load.
    """
    return permacache(
        *args,
        **kwargs,
        read_from_shelf_context_manager=swap_unpickler_context_manager(
            remapping_pickle().Unpickler
        ),
    )
