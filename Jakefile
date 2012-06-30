desc('Generate documentation from source');
task('generate-docs', [], function (params)
{
	var cmds = [];
	cmds.push('node ../dox-tpl/bin/dox-tpl -p ./package.json -t ./build/template/ *.js > docs/index.html');

	jake.exec(cmds, function ()
	{
		console.log('All docs generated.');
		complete();
	}, {printStdout: true});

}, {async: true});
