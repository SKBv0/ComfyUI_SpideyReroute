class AnyType(str):
    def __ne__(self, __value: object) -> bool:
        return False


any = AnyType("*")


class SpideyReroute:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "optional": {
                "": (any,),
            }
        }

    @classmethod
    def VALIDATE_INPUTS(cls, input_types):
        return True

    RETURN_TYPES = (any,)
    RETURN_NAMES = ("",)
    FUNCTION = "passthrough"
    CATEGORY = "SpideyReroute"

    def passthrough(self, **kwargs):
        # Get the first value from kwargs (input name is empty string)
        for v in kwargs.values():
            return (v,)
        return (None,)

    @classmethod
    def IS_CHANGED(cls, *args, **kwargs):
        return float("NaN")


NODE_CLASS_MAPPINGS = {
    "SpideyReroute": SpideyReroute
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "SpideyReroute": "SpideyReroute"
}
