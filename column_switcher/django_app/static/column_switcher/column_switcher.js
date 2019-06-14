var motors=[];
var motor_div = $('#motor_div');
wscs.add_on_indentify_function(function () {
    wscs.send(wscs.commandmessage("get_motor_ports","gui","server",true,[],{}));
    wscs.send(wscs.commandmessage("get_running_program","gui","server",true,[],{}));
});

column_switcher_program_stop_button=$('#program_stop_button');
column_switcher_program_run_button=$('#program_run_button');
column_switcher_program_stop_button.hide();
var column_switcher_running = false;

function get_motor_by_port(port) {
    for(let i=0;i<motors.length;i++)
        if(motors[i].port === port)
            return motors[i];
    return null;
}

function add_motor_port(data){
    var motor_data = data.data.kwargs.motor_data;
    var motor = get_motor_by_port(motor_data.port);
    if(motor === null) {
        motor = new Motor(motor_data.port);
        motors.push(motor);
    }
    motor.update(motor_data);

}

function set_position(data){
    var m = get_motor_by_port(data.data.kwargs.port);
    if(m !== null) m.set_position(data.data.kwargs.position);
}
wscs.add_cmd_funcion("add_motor_port", add_motor_port);
wscs.add_cmd_funcion("set_position", set_position);
wscs.add_cmd_funcion("set_program", set_program_profile);
class Motor{
    constructor(port){
        this.port = port;
        this._create_html_representation();
    }
    _create_html_representation () {
        this._html_elements = {};
        this._html_representation = $('<div></div>');
        this._html_elements.title = $("<lable>" + this.port + "</lable>");
        this._html_elements.position_controll = $("<input type='number' value='0' min='0' max='180' >");
        this._html_elements.current_position = $("<input type='number' value='0' min='0' max='180' readonly style='color: #ff0000;'>");
        this._html_elements.position_controll.change(function () {
            wscs.send(wscs.commandmessage("set_position","gui","server",true,[],{port:this.port,position: this._html_elements.position_controll.val()}))
        }.bind(this));
        this._html_representation.append(this._html_elements.title);
        this._html_representation.append(this._html_elements.position_controll);
        this._html_representation.append(this._html_elements.current_position);
        motor_div.append(this._html_representation);
    }

    update(motor_data){
        if(motor_data.name !== undefined) this.set_title(motor_data.name);
        if(motor_data.position !== undefined) this._html_elements.position_controll.val(motor_data.position);
    }
    set_title(title){this._html_elements.title.text(title)}
    get_title(){return this._html_elements.title.text()}
    set_position(pos){this._html_elements.current_position.val(pos)}

}


function program_input_validate(text){
    var rows=text.split("\n");
    var data=[];
    var data_width=0;

    for(let i=0;i < rows.length;i++){
        if($.trim(rows[i]) === "")
            continue;
        var cols = rows[i].replace(/\s/g, '\t').split("\t").map(function(item) {
            return parseFloat(item.replace(",","."), 10);
        });
        let n = cols.length - data_width;
        console.log(n);
        if(n > 0){
            for(let j=0;j<data.length;j++)
                for(let k=0;k<n;k++)
                    data[j].push([]);
            data_width += n
        }else if(n<0){
            for(let k=0;k<-n;k++)
                cols.push([])
        }
        data.push(cols)
    }
    
    data = data.sort(function (a,b) {
        if (a[0] < b[0]) return -1;
        if (a[0] > b[0]) return 1;
        return 0;
    });
    set_program(data);
}
$('#raw_program_input_validate').click(function(){program_input_validate($('#raw_program_input').val())});


function set_program_profile(data){
    var profile = data.data.kwargs.program_profile;
    if(data.data.kwargs.running)
        set_running();

    var table = $('#program_table');
    table.empty();
    var header = $('<tr><th>time</th></tr>');
    table.append(header);
    var times=[];
    var port_indices={};
    var p=0;
    for (var port in profile) {
        let motor = get_motor_by_port(port);
        header.append('<th>' + (motor?motor.get_title():port) + '</th>');
        for(let i=0;i<profile[port].length;i++)
            times.push(profile[port][i][0]);
        port_indices[port] = p;
        p++;
    }

    times =  times.filter(function (item, pos) {return times.indexOf(item) === pos});

    for(let i=0;i<times.length;i++){
        var row =$('<tr time="'+times[i]+'"></tr>');
        row.append('<td><input type="number" min="-9999" max="9999" time value="'+times[i]+'" /></td>');
        for (var port in profile) {
            row.append('<td><input type="number" min="-9999" max="9999" port="'+port+'" value="" /></td>');
        }
        table.append(row);
    }

    var alldone=true;
    for (var port in profile) {
        console.log(port,profile[port].length);
        for(let i=0;i<profile[port].length;i++){
            var row =table.find('[time="'+profile[port][i][0]+'"]');
            row.find('[port="'+port+'"]').val(profile[port][i][1]);
            if(profile[port][i][2]){
                row.css("background-color","#d4d40b");
                row.find('input').css("background-color","#d4d40b").prop('disabled', true);
            }else{
                alldone = false;
            }
        }
    }

    if(alldone && column_switcher_running)column_switcher_program_stop_button.click()
}

function set_running(){
    column_switcher_running = true;
    column_switcher_program_stop_button.show();
    column_switcher_program_run_button.hide();
}

set_program_profile({data:{kwargs:{program_profile:{}}}});
function set_program(data) {
    var table = $('#program_table');
    table.empty();
    var header = $('<tr><th>time</th></tr>');
    table.append(header);
    for (let i = 0; i < motors.length; i++) {
        header.append('<th>' + motors[i].get_title() + '</th>');
    }

    var data_width=Math.min(data[0].length,motors.length+1);
    for(let i=0;i<data.length;i++){
        var row =$('<tr time="'+data[i][0]+'"></tr>');
        table.append(row);
        for(let j=0;j<data_width;j++){
            row.append('<td><input type="number" min="-9999" max="9999" '+(j>0?'port="'+ motors[j-1].port+'"':'time')+' value="'+data[i][j]+'" /></td>');
        }
    }
    if(column_switcher_program_stop_button.is(":hidden") && column_switcher_program_run_button.is(":hidden")) {
        column_switcher_program_run_button.show();
    }
}


function column_switcher_run_program(){
    var table = $('#program_table');
    var program_profile={};
    table.find('[time]').each(function(index,ele){
        var row = $(ele);
        var time = parseFloat( row.find('[time]').val());
        row.find('[port]').each(function(index,ele){
            var p=$(ele);
            var port = p.attr('port');
            var val = p.val();
            if(program_profile[port] === undefined)
                program_profile[port]=[];
            program_profile[port].push([time,parseFloat(val)])
        });

    });
    wscs.send(wscs.commandmessage("run_program","gui","server",true,[],{program_profile:program_profile}));
}

function column_switcher_stop_program(){
    column_switcher_running = false;
    wscs.send(wscs.commandmessage("stop_program","gui","server",true,[],{}));
    column_switcher_program_stop_button.hide();
    column_switcher_program_run_button.show();
}

column_switcher_program_run_button.click(column_switcher_run_program);
column_switcher_program_stop_button.click(column_switcher_stop_program);
