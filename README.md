# sstd
simple ssh tunnel daemon - an autossh alternative powered by pm2

```
Usage: sstd [options]

  Options:

    -h, --help                output usage information
    -V, --version             output the version number
    --poll-firstup <n>        First poll interval after tunnel started
    --poll-interval <n>       Poll interval
    --poll-max-interval <n>   Max poll interval when retrying
    --poll-timeout <n>        Timeout for the request
    --poll-target <value>     Http server address and port like www.google.com:80
    --daemon-name <value>     The pm2 task name for ssh
    --daemon-args <args>      Arguments passed to ssh
    -c, --config-file <path>  A JSON file containing the arguments. The keys should be in camelCase style
```
