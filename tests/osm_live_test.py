import unittest, importlib.util, gzip, tempfile, pathlib
spec=importlib.util.spec_from_file_location('osm_live',pathlib.Path(__file__).parents[1]/'workers/osm-live.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class ReplicationTest(unittest.TestCase):
    def test_sequence(self):
        self.assertEqual(m.state(b'sequenceNumber=1234567\ntimestamp=2026-11-27T20\\:43\\:35Z\n')[0],1234567)
        self.assertEqual(m.sequence_path(1234567),'001/234/567')
    def test_tags_and_no_fake_deletions(self):
        x=gzip.compress(b'<osmChange><create><way id="42" version="1" timestamp="2026-11-27T20:43:35Z"><tag k="building" v="yes"/></way><node id="3" version="1"/></create><delete><way id="43" version="2"/></delete></osmChange>')
        counts,events=m.parse_changes(x,1);self.assertEqual(counts,{'create':1,'modify':0,'delete':0});self.assertEqual(events[0]['id'],42)
    def test_checkpoint_replay(self):
        with tempfile.TemporaryDirectory() as d:
            out=pathlib.Path(d)/'state.json';raw=gzip.compress(b'<osmChange><modify><way id="42" version="2"><tag k="building" v="yes"/></way></modify></osmChange>')
            old=m.download
            try:
                m.download=lambda path,limit=m.LIMIT: raw if path.endswith('.gz') else b'sequenceNumber=1\ntimestamp=2026-11-27T20\\:43\\:35Z\n'
                self.assertEqual(m.update(out)['counts']['modify'],1);self.assertEqual(m.update(out)['counts']['modify'],1)
            finally:m.download=old
if __name__=='__main__':unittest.main()
