import test from 'node:test';
import assert from 'node:assert/strict';
import {claimAudio} from '../src/audio-session.mjs';
test('each source cancels the previous source, including pending async playback, and stale releases are harmless',()=>{
 const stopped=[];
 const pending=claimAudio(()=>{stopped.push('loading exercise');pending.release();});
 const metronome=claimAudio(()=>stopped.push('metronome'));
 assert.equal(pending.current(),false);assert.equal(metronome.current(),true);
 pending.release();assert.equal(metronome.current(),true);
 const alarm=claimAudio(()=>stopped.push('alarm'));assert.equal(metronome.current(),false);
 const exercise=claimAudio(()=>stopped.push('exercise'));assert.equal(alarm.current(),false);
 assert.deepEqual(stopped,['loading exercise','metronome','alarm']);
 exercise.release();assert.equal(exercise.current(),false);
});
