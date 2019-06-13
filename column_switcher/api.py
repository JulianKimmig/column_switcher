import json
import threading
import time

from django_websocket_server.messagetemplates import commandmessage
from multi_purpose_arduino_controller.arduino_controller.api import ArduinoControllerAPI
from boards.servocontroller.board import ServoController

MOTORFIRMWARE = ServoController.FIRMWARE


class ProgramStep():
    def __init__(self, time, motor, position):
        self.time = time
        self.motor = motor
        self.position = position
        self.done=False

    def __repr__(self):
        return str(self)

    def __str__(self):
        return "Step: time:"+str(self.time)+", position:"+str(self.position)+", done:"+str(self.done)+", motor:"+str(self.motor)

class ColumnSwitcherAPI(ArduinoControllerAPI):
    def __init__(self, **kwargs):
        kwargs.setdefault("name", "ColumnSwitcherAPI")
        super().__init__(**kwargs)
        self._motors = {}
        self.start_time = time.time()
        self.runnning_program = []
        self.program = []
        self._programm_last_positions={}

    def ws_get_motor_ports(self):
        for port in self._motors:
            self.ws_get_motor_port(port)

    def ws_get_motor_port(self, port):
        motor = self._motors.get(port)
        if motor is None:
            return
        if self.websocket_server is not None:
            self.websocket_server.send_to_all(
                message=commandmessage("add_motor_port", sender="server", motor_data=motor))

    def boardupdate(self, boarddata=None):
        super().boardupdate(boarddata)
        if boarddata.get("firmware") is MOTORFIRMWARE:
            self.add_motor_port(boarddata)

    def add_motor_port(self, boarddata=None):
        if boarddata is None:
            return
        port = boarddata.get("port")
        if port is None:
            return
        if port in self._motors:
            self._motors[port] = {**self._motors[port], **boarddata}
            return
        self.logger.info("add motor port " + str(port))
        self._motors[port] = boarddata
        self.ws_get_motor_port(port)

    def set_websocket_server(self, websocket_server):
        super().set_websocket_server(websocket_server)
        self.websocket_server.register_cmd("get_motor_ports", self.ws_get_motor_ports)
        self.websocket_server.register_cmd("set_position", self.set_position)
        self.websocket_server.register_cmd("get_running_program", self.ws_get_running_program)
        self.websocket_server.register_cmd("run_program", self.ws_run_program)
        self.websocket_server.register_cmd("stop_program", self.ws_stop_program)

    def ws_stop_program(self):
        self.running = False
        time.sleep(0.2)
        self._programm_last_positions={}
        self.ws_get_running_program()

    def ws_run_program(self, program_profile, autostart=True):
        self.ws_stop_program()
        self.program=[]
        self._programm_last_positions={}
        for port, runpoints in program_profile.items():
            motor = self._motors.get(port)
            for runpoint in runpoints:
                self.program.append(ProgramStep(time=runpoint[0], motor=motor, position=runpoint[1]))

        self.program.sort(key=lambda step: step.time)
        from .django_app.models import SwitchProtocol
        self.db_programm = SwitchProtocol.objects.create(profile = json.dumps(self.get_running_profile()))

        if autostart:
            self.automation_thread = threading.Thread(target=self.run_program)
            self.running = True
            self.automation_thread.start()
            self.start_time = time.time()


        self.ws_get_running_program()

    def run_program(self):
        self.running = True
        self.datalogger.start_autosave(path=self.data_dir,savename=self.name+"_data")
        self._programm_last_positions={}
        while self.running:
            deltat = time.time() - self.start_time
            to_run = [step for step in self.program if not step.done and step.time < deltat]
            for step in to_run:
                self.set_position(port=step.motor['port'],position=step.position)
                self._programm_last_positions={step.motor['port']:step.position}
                step.done = True

            if len(to_run)>0:
                self.ws_get_running_program()
                self.db_programm.profile = json.dumps(self.get_running_profile())
                self.db_programm.save()
            time.sleep(0.05)
            for port,position in self._programm_last_positions.items():
                self.set_position(port=port,position=position)

            if not any([not step.done for step in self.program]):
                self.running=False
        self.datalogger.stop_autosave(mergedata=True)
        for step in self.program:
            step.done = False

    def get_running_profile(self):
        program_profile = {port:[] for port in self._motors}
        for step in self.program:
            try:
                program_profile[step.motor['port']].append([step.time,step.position,step.done])
            except:pass
        return program_profile

    def ws_get_running_program(self):
        if self.websocket_server is not None:
                self.websocket_server.send_to_all(
                    message=commandmessage("set_program", sender="server", program_profile=self.get_running_profile(),running=self.running)
                )

    def set_position(self, port=None, position=None):
        if port is None or position is None:
            return
        self.logger.debug("set position " + str(port) + " " + str(position))

        self.python_communicator.cmd_out(cmd="set_board_attribute", targets=[port], attribute="position",
                                         value=position)

    def datapoint(self, key=None, x=None, y=None, **kwargs):
        super().datapoint(key=key, x=x, y=y, **kwargs)
        port = kwargs.get('port')
        if port is None:
            return
        if port in self._motors:
            if key.endswith("_position"):
                if self.websocket_server is not None:
                    self.websocket_server.send_to_all(
                        message=commandmessage("set_position", sender="server", port=port, position=y))
