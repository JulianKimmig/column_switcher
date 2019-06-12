import sys

from django.apps import AppConfig

from . import i


class ColumnSwitcherConfig(AppConfig):
    name = ".".join(__name__.split(".")[:-1])
    label = __name__.split(".")[i - 1]
    verbose_name = " ".join(x.capitalize() or "_" for x in label.split("_"))
    module_path = ".".join(__name__.split(".")[:-1])
    print(name, verbose_name, label, module_path)

    to_context = True
    baseurl = label
    in_nav_bar = True

    in_nav_bar_html = "column_switcher_navar.html"
