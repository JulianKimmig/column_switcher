# import threading
# import time
# import urllib.request
#
# from apis.column_switcher.api import columnSwitcherAPI
# from to_own_package.arduino_controller.parseboards import parse_path_for_boards
# from to_own_package.api_websocket_server import socketserver
#
#
# from to_own_package.arduino_controller.serialreader import serialreader
# from to_own_package.software_communicator.python_communicator import PythonCommunicator

import logging
import os
import sys
import tempfile
import time
from logging.handlers import RotatingFileHandler
from os.path import expanduser

import coloredlogs
from json_dict import JsonDict

from django_websocket_server import websocket_server

from multi_purpose_arduino_controller.arduino_controller.parseboards import parse_path_for_boards
from multi_purpose_arduino_controller.arduino_controller.serialreader import serialreader
from multi_purpose_arduino_controller.controll_server.board_controller.board_controller_api import BoardControllerAPI
from column_switcher.api import ColumnSwitcherAPI
from multi_purpose_arduino_controller.python_communicator import PythonCommunicator

BASENAME = "Column Switcher"
SNAKE_NAME = BASENAME.lower().replace(' ', '_')
BASE_DIR = os.path.join(expanduser("~"),"."+SNAKE_NAME)



#modes
DEVELOPMENT_MODE=0
DEFAULT_MODE = DEVELOPMENT_MODE

def main():
    #main data dir
    os.makedirs(BASE_DIR, exist_ok=True)

    config = JsonDict(os.path.join(BASE_DIR, SNAKE_NAME+"_config.json"))

    #create basic logger
    logging_fmt = "%(asctime)s %(filename)s %(lineno)d %(name)s %(levelname)-8s  %(message)s"
    logging.basicConfig(
        level=config.get("basic","logging","level",default=logging.DEBUG),
        format=logging_fmt,
        datefmt="(%H:%M:%S)",
    )

    rotating_handler = RotatingFileHandler(os.path.join(BASE_DIR, 'log.log'), maxBytes=config.get("basic","logging","max_bytes",default=2**19), backupCount=config.get("basic","logging","backup_count",default=10))
    rotating_handler.setFormatter(logging.Formatter(logging_fmt))
    logging.getLogger('').addHandler(rotating_handler)
    #logger.addHandler(logging.StreamHandler())

    logger = logging.getLogger(BASENAME)

    coloredlogs.install(level='DEBUG',fmt=logging_fmt)

    logger.info("Use basedir: "+ os.path.abspath(BASE_DIR))

    # set server logger.
    from multi_purpose_arduino_controller.controll_server import manage as controll_server_manage
    #controll_server_manage.logger = logger

    #set_server_config
    controll_server_manage.CONFIG = config.getsubdict(preamble=['controll_server'])

    controll_server_manage.CONFIG.put("public","site","title",value=BASENAME)

    if config.get("basic","mode",default=DEFAULT_MODE) == DEVELOPMENT_MODE:
        controll_server_manage.CONFIG.put("django_settings","debug",value=True)
    else:
        controll_server_manage.CONFIG.put("django_settings","debug",value=False)

    apps = ["django_accounts",
            "multi_purpose_arduino_controller.controll_server.board_controller",
            "django_websocket_server",
            "column_switcher.django_app"
            ]
    #apps.append("serverapps.board_creator")
    controll_server_manage.CONFIG.put("django_settings", "apps", "additional", value=apps)


    #create pending migrations if in development mode
    if config.get("basic","mode",default=DEFAULT_MODE) == DEVELOPMENT_MODE:
        controll_server_manage.run(sys.argv[0],"makemigrations")
        controll_server_manage.run(sys.argv[0],"migrate")

        from django.contrib.auth.models import User
        superusers = User.objects.filter(is_superuser=True)
        if len(superusers) == 0:
            print("No Superuser specified")
            unsername = input("Enter Username: ")
            mail = input("Mail: ")
            pass1 = input("Password: ")
            User.objects.create_superuser(unsername, mail, pass1)

    controll_server_manage.CONFIG.put(
        "django_settings",
        "static_files",
        "dirs",
        value=[
            os.path.abspath(os.path.join(os.path.dirname(__file__), "apis", "static")),
            #socketserver_instance.get_www_data_path(),
            #socketserver.TEMPDIR
        ],
    )

    python_communicator = PythonCommunicator()

    #websocket server
    socketserver_instance = websocket_server.connect_to_first_free_port(data_dir=BASE_DIR,logger=logging.getLogger("websocket_server"),start_in_background=True,disable_encryption = config.get("websocket","security","disable_encryption",default=False))


    #parse for boards
    parse_path_for_boards(os.path.join(os.path.dirname(__file__),"boards"))


    board_controller_api = BoardControllerAPI(python_communicator=python_communicator,websocket_server=socketserver_instance,data_dir=os.path.join(BASE_DIR,"BoardControllerAPI"))

    column_switcher_api = ColumnSwitcherAPI(python_communicator=python_communicator,websocket_server=socketserver_instance,data_dir=os.path.join(BASE_DIR,"ColumnSwitcherAPI"))

    #SerialReader
    sr = serialreader.SerialReader(communicator=python_communicator,start_in_background=True,config=config.getsubdict(["portdata"]))



    #starts django
    controll_server_manage.run(sys.argv[0],"runserver","--noreload")



if __name__ == "__main__":
    main()







    python_communicator = PythonCommunicator()





#    column_controll_api = ColumnControlAPI(
#        name="columncontroller", communicator=python_communicator
#    )
#    column_controll_api.start()

#    column_controll_api = FractionCollectorAPI(
#        name="fractioncollector", communicator=python_communicator
#    )
 #   column_controll_api.start()

#    wsc = WebSocketCommunicator()

 #   with open(
 #       os.path.join(main_dir, "apis", "static", "js", "socketdata.js"), "w+"
 #   ) as f:
 #       f.write(
 #           "var serverdata={address : '"
 #           + wsc.websocket_server.ws_adress
 #           + "',\n"
 #           + "host : '"
 #           + wsc.websocket_server.host
 #           + "',\n"
 #           + "port : '"
 #           + str(wsc.websocket_server.port)
 #           + "'\n};"
 #       )
 #   python_communicator.add_output("websocket", wsc)

  #  column_controll_api.datalogger.start_autosave(
  #      path=os.path.join(os.path.dirname(__file__), "data"), savename="test"
  #  )





