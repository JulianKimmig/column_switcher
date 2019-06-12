import collections

from multi_purpose_arduino_controller.arduino_controller.arduino_variable import arduio_variable
from multi_purpose_arduino_controller.arduino_controller.basicboard.board import ArduinoBasicBoard
from boards.servocontroller import arduino_data


class ServoController(ArduinoBasicBoard):
    FIRMWARE = 89

    def __init__(self):
        super().__init__()
        self.add_pin("servopin",9)
        self.inocreator.add_creator(arduino_data.create)

    position = arduio_variable(name='position',type='uint8_t',eeprom=True,default=0,minimum=0,maximum=180,is_data_point=True)
    millis_per_step = arduio_variable(name='millis_per_step',type='uint16_t',eeprom=True,default=1,minimum=0,save=True)




if __name__ == "__main__":
    ins = ServoController()
    ins.create_ino()
