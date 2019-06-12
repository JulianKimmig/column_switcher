#define STARTANALOG 0
#define ENDANALOG 100
#define STARTBYTE 2
#define STARTBYTEPOSITION 0
#define COMMANDBYTEPOSITION 1
#define LENBYTEPOSITION 2
#define DATABYTEPOSITION 3
#define MAXFUNCTIONS 9
#define SERIALARRAYSIZE 13
#define BAUD 9600
#define MINPMW 544
#define MAXPMW 2400
#include <Servo.h>
#include <EEPROM.h>
uint8_t servopin = 9;
uint64_t firmware = 89;
uint32_t datarate = 200;
uint8_t position = 0;
uint16_t millis_per_step = 1;
uint8_t writedata[SERIALARRAYSIZE];
uint8_t serialread[SERIALARRAYSIZE];
uint8_t serialreadpos = 0;
uint8_t commandlength = 0;
uint8_t cmds[MAXFUNCTIONS ];
uint8_t cmd_length[MAXFUNCTIONS];
void (*cmd_calls[MAXFUNCTIONS])(uint8_t* data, uint8_t s);
uint32_t lastdata = 0;
uint32_t ct;
uint8_t c;
bool identified = false;
Servo myservo;
uint8_t pos = 0;
unsigned long  lastmove = 0;
uint16_t generate_checksum(uint8_t* data, int count){
uint16_t sum1 = 0;
uint16_t sum2 = 0;
for (int index = 0; index < count; ++index ) {
sum1 = (sum1 + data[index]) % 255;
sum2 = (sum2 + sum1) % 255;
}
return (sum2 << 8) | sum1;
}
void write_data_array(uint8_t* data, uint8_t cmd, uint8_t len){
writedata[STARTBYTEPOSITION] = STARTBYTE;
writedata[COMMANDBYTEPOSITION] = cmd;
writedata[LENBYTEPOSITION] = len;
for (uint8_t i = 0; i < len; i++) {
writedata[DATABYTEPOSITION + i] = data[i];
}uint16_t cs = generate_checksum(writedata, len + DATABYTEPOSITION);
writedata[DATABYTEPOSITION + len] = cs >> 8;
writedata[DATABYTEPOSITION + len + 1] = cs >> 0;
Serial.write(writedata, len + DATABYTEPOSITION + 2);
}
template< typename T> void write_data(T data, uint8_t cmd){
uint8_t d[sizeof(T)];
for (uint8_t i = 0;i<sizeof(T) ; i++) {
d[i] = (uint8_t) (data >> (8 * i) & 0xff );
}
write_data_array(d, cmd, sizeof(T));
}
uint64_t get_id(){
uint64_t id;
EEPROM.get(0, id);
return id;
}
void checkUUID(){
uint64_t id = get_id();
uint16_t cs = generate_checksum((uint8_t*)&id, sizeof(id));
uint16_t cs2;
EEPROM.get(sizeof(id), cs2);
if (cs != cs2) {
id = (uint64_t)((((uint64_t)random()) << 48) | (((uint64_t)random()) << 32) | (((uint64_t)random()) << 16) | (((uint64_t)random())));
EEPROM.put(0, id);
EEPROM.put(sizeof(id), generate_checksum((uint8_t*)&id, sizeof(id)));
}
}
void add_command(uint8_t cmd, uint8_t len, void (*func)(uint8_t* data, uint8_t s)){
for (uint8_t i = 0; i < MAXFUNCTIONS; i++ ) {
if (cmds[i] == 255) {
cmds[i] = cmd;
cmd_length[i] = len;
cmd_calls[i] = func;
return;
}
}
}
void endread(){
commandlength = 0;
serialreadpos = STARTBYTEPOSITION;
}
uint8_t get_cmd_index(uint8_t cmd){
for (uint8_t i = 0; i < MAXFUNCTIONS; i++ ) {
if (cmds[i] == cmd) {
return i;
}
}
return 255;}
void validate_serial_command(){
if(generate_checksum(serialread, DATABYTEPOSITION + serialread[LENBYTEPOSITION]) == (uint16_t)(serialread[DATABYTEPOSITION + serialread[LENBYTEPOSITION]] << 8) + serialread[DATABYTEPOSITION + serialread[LENBYTEPOSITION]+1]){
uint8_t cmd_index = get_cmd_index(serialread[COMMANDBYTEPOSITION]);
if(cmd_index != 255){
uint8_t data[serialread[LENBYTEPOSITION]];
memcpy(data,&serialread[DATABYTEPOSITION],serialread[LENBYTEPOSITION]);
cmd_calls[cmd_index](data,serialread[LENBYTEPOSITION]);
}
}
}
uint64_t readloop(){
while(Serial.available() > 0) {
c = Serial.read();
serialread[serialreadpos] = c;
if (serialreadpos == STARTBYTEPOSITION) {
if (c == STARTBYTE) {
} else {
endread();
continue;
}
}
else {
if (serialreadpos == LENBYTEPOSITION) {
commandlength = c;
} else if (serialreadpos - commandlength > DATABYTEPOSITION + 1 ) { //stx cmd len cs cs (len = 0; pos = 4)
endread();
continue;
}
else if (serialreadpos - commandlength == DATABYTEPOSITION + 1) {
validate_serial_command();
endread();
continue;
}
}
serialreadpos++;
}
}
void identify_0(uint8_t* data, uint8_t s){
identified=data[0];uint64_t id = get_id();write_data(id,0);}
void get_firmware_1(uint8_t* data, uint8_t s){
write_data(firmware,1);}
void set_datarate_2(uint8_t* data, uint8_t s){
uint32_t temp;memcpy(&temp,data,4);datarate=temp;}
void get_datarate_3(uint8_t* data, uint8_t s){
write_data(datarate,3);}
void set_position_4(uint8_t* data, uint8_t s){
position=data[0];}
void get_position_5(uint8_t* data, uint8_t s){
write_data(position,5);}
void set_millis_per_step_6(uint8_t* data, uint8_t s){
uint16_t temp;memcpy(&temp,data,2);millis_per_step=temp;}
void get_millis_per_step_7(uint8_t* data, uint8_t s){
write_data(millis_per_step,7);}
void servopin_8(uint8_t* data, uint8_t s){
if(data[0]>0){servopin=data[0];}write_data(servopin,8);pinMode(servopin, OUTPUT);}

void dataloop(){
write_data(pos,5);
}

void loop(){
readloop();
ct = millis();
if(ct-lastdata>datarate && identified){
dataloop();
lastdata=ct;
}
pos = myservo.read();
if(lastmove+millis_per_step<=ct){
if(pos>position){
myservo.write(pos-1);
}
else if(pos<position){
myservo.write(pos+1);
}
lastmove=ct;
}

}

void setup(){
Serial.begin(BAUD);
while (!Serial) {;}
for (int i = STARTANALOG; i < ENDANALOG; i++) {
randomSeed(analogRead(i)*random());
}
checkUUID();
for (uint8_t i = 0; i < MAXFUNCTIONS; i++ ) {
cmds[i] = 255;
}
ct = millis();
pinMode(servopin, OUTPUT);
add_command(0, 1, identify_0);
add_command(1, 0, get_firmware_1);
add_command(2, 4, set_datarate_2);
add_command(3, 0, get_datarate_3);
add_command(4, 1, set_position_4);
add_command(5, 0, get_position_5);
add_command(6, 4, set_millis_per_step_6);
add_command(7, 0, get_millis_per_step_7);
add_command(8, 1, servopin_8);
myservo.attach(9,MINPMW,MAXPMW);
}
