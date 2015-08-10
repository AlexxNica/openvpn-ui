var	fs		=   require('fs'),
	yaml	=	require('js-yaml'),
	promise	=	require('bluebird'),
	url		=	require('url'),
	config;
;

// Promisfication
promise.promisifyAll(fs);

function check(conf)
{
	return new promise(function(resolv, reject)
	{
		// Listen options
		if( ! conf.listen || isNaN(conf.listen.port) || !  conf.listen.address)
			reject('Invalid listen directive.');
		
		// CA cert and key check
		fs.readFileAsync(conf.ca.cert).then(function(cert)
		{
			conf.ca.cert	=	cert;

			fs.readFileAsync(conf.ca.key).then(function(key)
			{
				conf.ca.key	=	key;

				if( ! conf.sso || ! conf.sso.api || ! url.parse(conf.sso.api) || ! conf.sso.cookie)
					reject('Invalid SSO configuration');
				
				if( ! conf.endpoints)
					reject('Invalid endpoints configuration.');
				
				for(var endpoint in conf.endpoints)
				{
					if( ! conf.endpoints[endpoint].name)
						reject('Invalid client name.');
					
					if(isNaN(conf.endpoints[endpoint].keysize))
						reject('Invalid client keysize.');

					if( ! conf.endpoints[endpoint].suffix)
						conf.endpoints[endpoint].suffix	=	null;
				}
				
				resolv(conf);
			})
			.catch(function(e)
			{
				reject(e);
			});
		})
		.catch(function(e)
		{
			reject(e);
		});
	});
}

exports.load =	function(cb)
{
	fs.readFileAsync(__dirname + '/../config.yml').then(yaml.safeLoad).then(check).then(function(conf)
	{	
		cb(conf);
	})
	.catch(function(e)
	{
		console.log('An error occured', e);
		process.exit(1);
	});
};