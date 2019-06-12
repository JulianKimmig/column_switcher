import os

i = -1
if __name__.split(".")[i] == "django_app":
    i = -2

default_app_config = (
    __name__
    + ".apps."
    + "".join(x.capitalize() or "_" for x in __name__.split(".")[i].split("_"))
    + "Config"
)


snake_name = __name__.split(".")[i]
template_dir = os.path.join(os.path.dirname(__file__), "templates")
if not os.path.isdir(template_dir):
    os.mkdir(template_dir)

index_file = os.path.join(template_dir, snake_name + "_index.html")
if not os.path.isfile(index_file):
    with open(index_file, "w+") as f:
        f.write(
            "{% extends 'basic.html' %}\n"
            + "{% block contend %}\n"
            + " ".join(x.capitalize() or "_" for x in __name__.split(".")[i].split("_"))
            + "\n{% endblock %}\n"
        )

static_dir = os.path.join(os.path.dirname(__file__), "static")
if not os.path.isdir(static_dir):
    os.mkdir(static_dir)
static_app_dir = os.path.join(static_dir, snake_name)
if not os.path.isdir(static_app_dir):
    os.mkdir(static_app_dir)
