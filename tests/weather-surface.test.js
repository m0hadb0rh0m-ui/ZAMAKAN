import test from 'node:test';
import assert from 'node:assert/strict';
import {surfaceSamples,interpolateSurface,surfaceColor} from '../src/weather-surface.js';
const field='temperature_2m';
const point=(lon,lat,value,time='2026-01-01T00:00')=>({geometry:{coordinates:[lon,lat]},properties:{[field]:value,time}});
test('continuous weather surface is constrained to actual sample hull and time',()=>{const s=surfaceSamples({features:[point(34,31,10),point(35,31,20),point(34,32,20),point(35,32,30),point(25,20,99,'other')]},field);assert.equal(s.pts.length,4);assert.equal(interpolateSurface(s,s.pts[0].x,s.pts[0].y),10);assert.equal(interpolateSurface(s,s.west-1,s.south),null);const v=interpolateSurface(s,(s.west+s.east)/2,(s.south+s.north)/2);assert(v>19&&v<21);});
test('missing or collinear samples do not invent a surface',()=>{assert.equal(surfaceSamples({features:[point(34,31,10),point(34,31,20)]},field),null);});
test('color matches documented scale',()=>assert.deepEqual(surfaceColor(field,-20),[57,101,188]));
