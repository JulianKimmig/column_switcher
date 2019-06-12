
def definitions(self):
    return {
        'MINPMW': 544,
        'MAXPMW': 2400,
    }


def global_vars(self):
    return {'myservo': ['Servo', None],
            'pos': ['uint8_t', 0],
            'lastmove': ['unsigned long ', 0],
            }


def includes(self):
    return ['<Servo.h>']


def functions(self):
    return {}


def setup(self):
    setup = 'myservo.attach('+str(self.get_pin("servopin").position)+',MINPMW,MAXPMW);'
    return setup


def loop(self):
    return 'pos = myservo.read();\n' \
           'if(lastmove+millis_per_step<=ct){\n' \
           'if(pos>position){\n' \
           'myservo.write(pos-1);\n' \
           '}\n' \
           'else if(pos<position){\n' \
           'myservo.write(pos+1);\n' \
           '}\n' \
           'lastmove=ct;\n' \
           '}\n'


def dataloop(self):
    return 'write_data(pos,'+str(self.get_portcommand_by_name("get_position").byteid)+');'


def create(self):
    return {
        'definitions': definitions(self),
        'includes': includes(self),
        'global_vars': global_vars(self),
        'functions': functions(self),
        'setup': setup(self),
        'loop': loop(self),
        'dataloop': dataloop(self)
    }
