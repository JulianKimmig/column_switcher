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
    wscs.send(wscs.commandmessage("stop_program","gui","server",true,[],{}));
    column_switcher_program_stop_button.hide();
    column_switcher_program_run_button.show();
}

column_switcher_program_run_button.click(column_switcher_run_program);
column_switcher_program_stop_button.click(column_switcher_stop_program);









function get_motor_by_id(id) {
    for(let i=0;i<motors.length;i++)
        if(motors[i].id === id)
            return motors[i];
    return null;
}

function add_motor(motor) {
    let divid="motorcontroll_"+motor.id;
    motor.div=$('<li  id="'+divid+'" style="display: inline-block;margin: 20px;"><div id="'+divid+"_svg"+'"></div><div style="font-size: 12px;">'+motor.id+'</div></li >');
    $('#motorcontrolls').append(motor.div);
    motor.knob=new Knob(divid+"_svg",360,0,180);
    motor.knob.dragfunction=motor.knob.stopfunction=function(value){
        wscs.send(wscs.commandmessage("set_position","gui","columnswitcherapi",true,[],{position:value,id:motor.id}))
    };


    motors.push(motor);
    return motors[motors.length - 1]
}

function update_motor(motordat) {
    var motor = get_motor_by_id(motordat.id);
    if(motor === null)
        motor = add_motor(motordat);

    motor.position = motordat.position;

    motor.knob.value(motor.position);
    motor.updated=true;
}

function remove_motor(id) {
    for(let i=motors.length-1;i>=0;i--){
        if(!motors[i].id === id) {
            motors[i].knob.remove();
            motors[i].div.remove();
            motors.splice(i, 1);
            return
        }
    }
}

function set_motors(data){
    for(let i=0;i<motors.length;i++)
        motors[i].updated = false;
    let motolist=data.data.kwargs.motors;
    for(let i=0;i<motolist.length;i++)
        update_motor(motolist[i]);

    for(let i=0;i<motors.length;i++)
        if(!motors[i].updated)
            remove_motor(!motors[i].id)
}

function set_motor_order(data,to_server=false){
    var motororder = data.data.kwargs.ordered_ids;
    motors.sort(function(a, b){
        return motororder.indexOf(a.id) - motororder.indexOf(b.id);
    });
    for(let i=0;i<motors.length;i++){
        motors[i].div.appendTo($('#motorcontrolls'));
    }
    if(to_server){
        wscs.send(wscs.commandmessage("set_motor_order","gui","columnswitcherapi",true,[],{ordered_ids: motors.map(m => m.id)}))
    }
}
wscs.add_cmd_funcion("set_motors", set_motors);
wscs.add_cmd_funcion("set_motors", set_motors);
wscs.add_cmd_funcion("set_motor_order", set_motor_order);


var fileInput = document.getElementById("csv"),

    readFile = function () {
        var reader = new FileReader();
        reader.onload = function () {
            wscs.send(wscs.commandmessage("set_program","gui","columnswitcherapi",true,[],{csv_data:reader.result}))
        };
        // start reading the file. When it is done, calls the onload event defined above.
        reader.readAsBinaryString(fileInput.files[0]);

        try{
            fileInput.value = '';
            if(fileInput.value){
                fileInput.type = "text";
                fileInput.type = "file";
            }
            if(fileInput.value){
                fileInput.parentNode.replaceChild(fileInput.cloneNode(true), fileInput);
            }
        }catch(e){}
    };

fileInput.addEventListener('change', readFile);



function sset_program(data){
    var code = data.data.kwargs.code;
    var table = $("<table/>");
    $("#programtable").empty().append(table);
    var header = $("<tr><th>time</th></tr>");
    table.append(header);
    var id_list=[];
    for(let line =0;line<code.length;line++){
        var row=$("<tr "+(code[line].done?"style='background-color:rgba(255,200,40,0.5)'":"")+"><td>"+code[line].time+"</td></tr>");
        table.append(row);
        for(let id in id_list)
            row.append("<td>-</td>");
        for(let opnr=0;opnr<code[line].operations.length;opnr++){
            var indx = id_list.indexOf(code[line].operations[opnr].id);
            if(indx === -1){
                table.find("tr").each(function(i,e) {
                    if(i === 0)
                        $(e).append("<th>"+code[line].operations[opnr].id+"</th>");
                    else
                        $(e).append("<td>-</td>");
                });
                id_list.push(code[line].operations[opnr].id);
                indx = id_list.length - 1;
            }
            row.find("td").eq(indx+1).html(code[line].operations[opnr].value)
        }
    }
}
wscs.add_cmd_funcion("set_program", set_program);

default_colors= [
    '#1f77b4',  // muted blue
    '#ff7f0e',  // safety orange
    '#2ca02c',  // cooked asparagus green
    '#d62728',  // brick red
    '#9467bd',  // muted purple
    '#8c564b',  // chestnut brown
    '#e377c2',  // raspberry yogurt pink
    '#7f7f7f',  // middle gray
    '#bcbd22',  // curry yellow-green
    '#17becf'   // blue-teal
];


var ctx = document.getElementById('datachart').getContext('2d');
var datachart = new Chart(ctx, {
    type: 'line',
    data:{
        labels: [],
        datasets: []
    },
    options: {
        elements: {
            line: {
                tension: 0 // disables bezier curves
            }
        },
        scales: {
            yAxes: [{
                id: 'position',
                type: 'linear',
                position: "left"
            }],
            xAxes:[{
                id: "time",
                type: 'linear',
                scaleLabel:"time"
            }
            ]
        }}

});


$( function() {
    var mc = $("#motorcontrolls");
    mc.sortable({
        stop: function( event, ui ) {
            var motororder  = mc.sortable("toArray").join('').replace("motorcontroll_","").split("motorcontroll_");
            set_motor_order({data:{kwargs:{ordered_ids:motororder}}},to_server=true);
        },
        cancel: "svg"
    });
    mc.disableSelection();



    $('.nav-tabs a').click(function (e) {
        $(this).tab('show');
        var scrollmem = $('body').scrollTop() || $('html').scrollTop();
        window.location.hash = this.hash;
        $('html,body').scrollTop(scrollmem);
    });

    var hash = window.location.hash;
    hash && $('[href="' + hash + '"]').tab('show');

    wscs.identify_functions.push(function () {
        wscs.send(wscs.commandmessage("get_data","gui","columnswitcherapi",true,[],{data_target:"gui"}))
    });

} );


function recive_data(data,update=true){
    data = data.data;
    var label =  data.key.replace("_data","");
    var ispos = false;


    if(label.includes("_pos")){
        label =  data.key.replace("_pos","");
        ispos = true
    }

    var dataindex=datachart.data.labels.indexOf(label);
    if(dataindex === -1){
        datachart.data.labels.push(label);
        dataindex=datachart.data.labels.indexOf(label);
        datachart.data.datasets.push({
            label: label,
            yAxisID: ispos?"position":label+"_axis",
            data: [],
            fill: false,
            borderColor: default_colors[(dataindex)%(default_colors.length-1)],
            backgroundColor: default_colors[(dataindex)%(default_colors.length-1)]
        });
    }

    var axexists = false;
    for (i = 0; i < datachart.options.scales.yAxes.length; i++) {
        if(datachart.options.scales.yAxes[i].id === datachart.data.datasets[dataindex].yAxisID){
            axexists=true;
            break;
        }
    }

    if(!axexists){
        datachart.options.scales.yAxes.push({
            id: datachart.data.datasets[dataindex].yAxisID,
            type: 'linear',
            position: 'right',
        })
    }

    datachart.data.datasets[dataindex].data.push({x:data.x,y:data.y});
    if(update)
        datachart.update();
}

wscs.add_type_funcion("data", recive_data);

function set_data(data){
    data=data.data.kwargs.data;
    console.log(data);
    datachart.data={
        labels: [],
        datasets: []
    };
    for(let key in data){
        for(let i =0;i<data[key].length;i++){
            recive_data({data:{key:key,x:data[key][i][0],y:data[key][i][1],t:data[key][i][2]}},false);
        }
    }
}

wscs.add_cmd_funcion("set_data", set_data);