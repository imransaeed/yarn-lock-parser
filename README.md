# yarn-lock-parser
Simple project to parse a yarn lock file and seek upgrade possibilities

## Usage
`node index.js <path-to-yarn.lock>`

The command takes only one parameter which is the path to a yarn.lock file. The output is in the same location and same file name appended with a .csv extension. 
`node index.js /path/yarn.lock` will generate `/path/yarn.lock.csv`

## Disclaimer
This is just a PoC 
