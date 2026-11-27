import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHeight,classifyHeight,matchBuilding} from '../src/building-height.js';
test('height parser handles meters and feet without guessing malformed tags',()=>{assert.equal(parseHeight('12 m'),12);assert.equal(parseHeight('10 ft'),3.048);assert.equal(parseHeight('10;20'),null);assert.equal(parseHeight('0'),null);});
test('tagged height is recorded but never claimed independently measured',()=>{const h=classifyHeight({height:'18','source:height':'survey'});assert.equal(h.kind,'recorded');assert.equal(h.meters,18);assert.equal(h.independentlyVerified,false);assert.equal(h.source,'survey');});
test('levels are an estimate, render-only is not measured',()=>{assert.deepEqual(classifyHeight({'building:levels':'3'}).meters,9);assert.equal(classifyHeight({},15).kind,'render-only');assert.equal(classifyHeight({}).kind,'unknown');});
test('exact polygon selection and ambiguous overlap',()=>{const e={type:'way',id:123,tags:{building:'yes',height:'12'},geometry:[{lon:34,lat:31},{lon:35,lat:31},{lon:35,lat:32},{lon:34,lat:32},{lon:34,lat:31}]};assert.equal(matchBuilding({elements:[e]},34.5,31.5).osmId,123);assert.equal(matchBuilding({elements:[e,{...e,id:456}]},34.5,31.5).kind,'ambiguous');assert.equal(matchBuilding({elements:[e]},30,31).kind,'ambiguous');});
