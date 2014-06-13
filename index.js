/**
 * Created by delian on 6/13/14.
 */

var fs = require('fs');
var http = require('http');
var nf = require('node-netflowv9')();

var startTime = (new Date("2014-06-12")).getTime();
var endTime = (new Date("2014-06-13")).getTime();

var nets = [];

function refresh() {
    http.get('http://www.rix.is/is-net.txt',function(res) {
        res.setEncoding('utf8');
        var data='';res.on('data',function(chunk){data+=chunk;});
        res.on('end',function() {
            nets=data.match(/(\d+\.\d+\.\d+\.\d+\/\d+)/g);
        });
    }).on('error', function(e) { });
};
refresh();

var readChunkLen = 10000000;
var dir = 'dump';
var templates = {};
var cntPkts = 0;
var cntFlows = 0;

// In 5 sec we will have the NETS
fs.readdirSync('dump').filter(function(n) { return /\.bin/.test(n) }).forEach(function(file) {
    var filename = dir+'/'+file;
    var buffer = new Buffer(0);

    var f = fs.openSync(filename,'r');
    var tmpBuf = new Buffer(readChunkLen);
    var len;

    while((len = fs.readSync(f,tmpBuf,0,readChunkLen))>0) {
        buffer = Buffer.concat([buffer,tmpBuf.slice(0,len)]);
        console.log('got',buffer.length);

        // Now let us decode the buffer data
        while(buffer.length) {
            var rheader = buffer.slice(0,14);
            var ts = rheader.readUInt32BE(0)*1000 + rheader.readUInt16BE(4);
            var raddress = rheader.readUInt32BE(6);
            var rport = rheader.readUInt16BE(10);
            var plen = rheader.readUInt16BE(12);
            if (buffer.length>=14+plen) {
                var packet = buffer.slice(14,14+plen);
                var o = nf.nfPktDecode(packet,templates);
                cntPkts++;
                cntFlows+= o.flows.length;
                console.log(o);
                //console.log(ts,':',o);
                buffer = buffer.slice(14+plen);
            } else break;
        }
    }

    fs.closeSync(f);
});

console.log('Count of packets',cntPkts,'flows',cntFlows);