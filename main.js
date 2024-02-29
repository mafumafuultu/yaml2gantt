const _g = {};
const ymldir = a => a.map(v => `./tasks/${v}`);
const loadYaml = async url => fetch(url).then(v => v.text()).then(v => jsyaml.load(v))
const onload = () => document.readyState !== 'complete'
	? new Promise(r => document.addEventListener('readystatechange', () => {
		switch (document.readyState) {
			case 'complete': r();break;
			default:
		}
	}))
	: Promise.resolve();

const applyTasks = () => {
	loadYaml('./tasks/task.yml')
	.then(data => {
		_g.gantt.refresh(data);
		_g.tagify.whitelist.length = 0;
		_g.tagify.whitelist = data.map(v => v.id)
	});
};

const saveYaml = () => {
	
	_g.io.emit('save', _g.gantt.tasks.map(({id, name, _start, _end, progress, dependencies} = v) => ({id, name, start: _start.toISOString().replace(/[TZ]/g, ' '), end: _end.toISOString().replace(/[TZ]/g, ' '), progress, dependencies})));
}

onload().then(_ => {
	init();
});

function init() {
	genGantt();
	genEvents();
}
function genEvents() {

	_g.io = io();
	_g.io.on('fswatch', applyTasks);

	_g.elems = {
		id: document.getElementById('task_id'),
		name: document.getElementById('task_name'),
		start: document.getElementById('task_start'),
		end: document.getElementById('task_end'),
		progress: document.getElementById('task_progress'),
		progress_v: document.getElementById('task_progress_v'),
		dependencies: document.getElementById('task_dependencies'),
		apply: document.getElementById('apply')
	};
	_g.tagify = new Tagify(_g.elems.dependencies, {
		enforceWhitelist : true,
		delimiters : null,
		whitelist : [],
		dropdown: {
			position: "input",
			enabled : 0 // always opens dropdown when input gets focus
		}
	});
	_g.elems.progress.addEventListener('input', function(e, data) {
		_g.elems.progress_v.value = this.value;
	})
	applyTasks();
}

function genGantt() {

	var tasks = [{}];
	_g.gantt = new Gantt('#gantt', tasks, {
		column_width: 30,
		step: 24,
		view_modes: ['Quarter Day', 'Half Day', 'Day', 'Week', 'Month'],
		bar_height: 20,
		bar_corner_radius: 3,
		arrow_curve: 5,
		padding: 18,
		date_format: 'YYYY-MM-DD HH:mm:ss',
		language: 'en', // or 'es', 'it', 'ru', 'ptBr', 'fr', 'tr', 'zh', 'de', 'hu'
		on_click: gantt_on_clik,
		on_date_change: gantt_on_date_change,
		on_progress_change: gantt_on_progress_change,
		on_view_change: function(mode) {
			document.querySelector('button.mode_check')?.classList.remove('mode_check');
			document.querySelector(`button[data-role="${mode}"]`).classList.add('mode_check');
		},
		// can be a function that returns html
		// or a simple html string
		custom_popup_html: function(task) {
			// the task object will contain the updated
			// dates and progress value
			const end_date = task._end.toISOString().replace(/[TZ]/g, ' ');
			return `<div class="details-container">
				<div class="details-title">${task.name}</div>
				<span>ID: ${task.id}</span><br>
				<span>Limit: ${end_date}</span><br>
				<p>${task.progress}% completed!</p>
			</div>`;
		}
	});
}

function gantt_on_clik(task) {
	_g.elems.id.value = task.id;
	_g.elems.name.value = task.name;
	_g.elems.start.valueAsDate = task._start;
	_g.elems.end.valueAsDate = task._end;
	_g.elems.progress.value = task.progress;
	_g.elems.progress_v.value = task.progress;
	_g.tagify.removeAllTags();
	if (task.dependencies) {
		_g.tagify.addTags(task.dependencies);
	}
}

function gantt_on_date_change(task, start, end) {
	if (_g.elems.id.value === task.id) {
		task.start = _g.elems.start.valueAsDate  = start;
		task.end = _g.elems.end.valueAsDate  = end;
	} else {
		gantt_on_clik(task);
	}
}
function gantt_on_progress_change(task, progress) {
	if (_g.elems.id.value === task.id) {
		_g.elems.progress.value = progress;
		_g.elems.progress_v.value = task.progress;
	} else {
		gantt_on_clik(task);
	}
}

function change_mode(mode) {
	_g.gantt.change_view_mode(mode);
}
function deleteTask() {
	let task = _g.gantt.get_task(_g.elems.id.value.trim());
	if (task) {
		_g.gantt.tasks = _g.gantt.tasks.reduce((a, v) => {
			if (task.id !== v.id) a.push(v);
			return a;
		}, []);
		_g.gantt.refresh(_g.gantt.tasks);
		
		_g.tagify.whitelist.length = 0;
		_g.tagify.whitelist = _g.gantt.tasks.map(v => v.id);
	}

}
function applyTask() {
	let task = _g.gantt.get_task(_g.elems.id.value.trim());
	if (task) {
		_g.gantt.tasks.forEach(v => {
			if (v.id === task.id) {
				Object.assign(v, {
					name: _g.elems.name.value.trim(),
					start: _g.elems.start.valueAsDate,
					end: _g.elems.end.valueAsDate,
					progress: _g.elems.progress.value,
					dependencies: _g.tagify.value.map(v => v.value)
				});
			}
		});
	} else {
		_g.gantt.tasks.push({
			id: _g.elems.id.value.trim(),
			name: _g.elems.name.value.trim(),
			start: _g.elems.start.valueAsDate,
			end: _g.elems.end.valueAsDate,
			progress: _g.elems.progress.value,
			dependencies: _g.tagify.value.map(v => v.value)
		})
	}
	_g.gantt.refresh(_g.gantt.tasks);
	_g.tagify.whitelist.length = 0;
	_g.tagify.whitelist = _g.gantt.tasks.map(v => v.id);
}