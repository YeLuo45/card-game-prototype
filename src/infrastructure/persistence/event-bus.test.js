'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'event-bus.js'), 'utf8'));
var WorldEventBus = window.WorldEventBus;
var DynamicEventQueue = window.DynamicEventQueue;
var WorldEvent = window.WorldEvent;
var EventPriority = window.EventPriority;
var passed = 0, failed = 0;
function assert(c,msg){if(c){passed++;console.log('  ok '+msg);}else{failed++;console.log('  FAIL: '+msg);}}
function assertEq(a,b,msg){if(a===b){passed++;console.log('  ok '+msg);}else{failed++;console.log('  FAIL: '+msg+' (expected '+b+', got '+a+')');}}

{var bus=new WorldEventBus();assert(bus!==null,'bus created');}
{var bus=new WorldEventBus();var r=bus.subscribe('test_event',function(){},'h1');assert(r.success,'subscribe success');assertEq(r.subscriberCount,1,'1 subscriber');}
{var bus=new WorldEventBus();bus.subscribe('test_event',function(){},'h1');var r=bus.unsubscribe('test_event','h1');assert(r.success,'unsubscribe success');assertEq(r.subscriberCount,0,'0 subscribers');}
{var bus=new WorldEventBus();var delivered=0;bus.subscribe('test_event',function(){delivered++;},'h1');bus.publish({type:'test_event',data:{}});assertEq(delivered,1,'1 delivered');}
{var bus=new WorldEventBus();var delivered=0;bus.subscribe('test_event',function(){delivered++;},'h1');bus.subscribe('test_event',function(){delivered++;},'h2');bus.publish({type:'test_event',data:{}});assertEq(delivered,2,'2 delivered');}
{var bus=new WorldEventBus();var delivered=0;bus.subscribe('test_event',function(e){delivered++;assertEq(e.type,'test_event','event type');},'h1');bus.publish({type:'test_event',data:{value:42}});}
{var bus=new WorldEventBus();bus.subscribe('e1',function(){},'h1');bus.subscribe('e1',function(){},'h2',EventPriority.HIGH);var r=bus.publish({type:'e1',data:{}});assertEq(r.totalSubscribers,2,'2 total');}
{var bus=new WorldEventBus();var delivered=0;bus.subscribe('e1',function(){delivered++;},'h1');bus.publish({type:'e1',data:{}});var hist=bus.getEventHistory('e1');assertEq(hist.length,1,'1 history');}
{var bus=new WorldEventBus();bus.subscribe('e1',function(){},'h1');var stats=bus.getStatistics();assert(stats.totalDispatches>=0,'has dispatch count');}
{var q=new DynamicEventQueue(new WorldEventBus());assert(q!==null,'queue created');}
{var q=new DynamicEventQueue(new WorldEventBus());var r=q.enqueue(new WorldEvent('test',{}),0);assert(r.success,'enqueue success');assertEq(q.getQueueSize(),1,'1 in queue');}
{var bus=new WorldEventBus();var q=new DynamicEventQueue(bus);var delivered=0;bus.subscribe('test',function(){delivered++;},'h1');q.enqueue(new WorldEvent('test',{}),0);q.tick();assertEq(delivered,1,'1 delivered via tick');}
{var bus=new WorldEventBus();var q=new DynamicEventQueue(bus);q.enqueue(new WorldEvent('test',{}),0);q.enqueue(new WorldEvent('test',{}),0);q.enqueue(new WorldEvent('test',{}),0);assertEq(q.getQueueSize(),3,'3 in queue');}
{var bus=new WorldEventBus();var q=new DynamicEventQueue(bus);var delivered=0;bus.subscribe('recurring',function(){delivered++;},'h1');q.scheduleRecurring('recurring',{},50,3);var base=Date.now();for(var i=0;i<5;i++){q.tick(base+i*100);}assert(delivered>=1,'at least 1 recurring');}
{var bus=new WorldEventBus();var q=new DynamicEventQueue(bus);var schedId=q.scheduledEvents?Object.keys(q.scheduledEvents)[0]:null;}

console.log('\n===== Summary =====');
console.log('Passed: '+passed+'/'+(passed+failed)+' = '+(passed*100/(passed+failed)).toFixed(1)+'%');
console.log('Threshold 99%: '+(passed/(passed+failed)>=0.99?'PASS':'FAIL'));
if(failed>0)process.exit(1);