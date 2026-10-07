import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Empty, Modal } from '../../components';

const TYPES = [['MEAL', '食堂餐券'], ['HAIRCUT', '理发券'], ['HEALTHCHECK', '体检优惠'], ['HONOR', '公益荣誉']];

export default function RewardsManage() {
  const [rewards, setRewards] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'MEAL', points: 10, stock: 10, description: '' });
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  async function load() { setRewards(await api('/rewards')); }
  useEffect(() => { load().catch((e) => setErr(e.message)); }, []);

  async function create() {
    try {
      await api('/rewards', { method: 'POST', body: { ...form, points: +form.points, stock: +form.stock } });
      setShowForm(false);
      setMsg('奖励已上架。');
      load();
    } catch (e) { setErr(e.message); }
  }
  async function restock(r) {
    const amount = prompt(`为「${r.name}」补货数量`, '10');
    if (!amount) return;
    try {
      await api(`/rewards/${r.id}/restock`, { method: 'POST', body: { amount: +amount } });
      setMsg(`已补货 ${amount} 份。`);
      load();
    } catch (e) { setErr(e.message); }
  }

  return (
    <div>
      <div className="flex-between">
        <h1 className="page-title">奖励与库存</h1>
        <button onClick={() => setShowForm(true)}>＋ 上架奖励</button>
      </div>
      <p className="page-sub">维护食堂餐券、理发券、体检优惠、公益荣誉的积分价格与库存；库存不足时志愿者无法兑换且不扣积分。</p>
      {msg && <div className="alert alert-ok">{msg}</div>}
      {err && <div className="alert alert-error">{err}</div>}
      <div className="table-wrap">
        <table>
          <thead><tr><th>奖励</th><th>类型</th><th>积分</th><th>库存</th><th>已兑现</th><th>操作</th></tr></thead>
          <tbody>
            {rewards.length === 0 && <tr><td colSpan={6}><Empty /></td></tr>}
            {rewards.map((r) => (
              <tr key={r.id}>
                <td><strong>{r.name}</strong><div className="small muted">{r.description}</div></td>
                <td>{TYPES.find((t) => t[0] === r.type)?.[1]}</td>
                <td>{r.points}</td>
                <td>{r.stock <= 3 ? <span className="tag red">仅剩 {r.stock}</span> : r.stock}</td>
                <td>{r.redeemedCount}</td>
                <td><button className="btn-sm" onClick={() => restock(r)}>补货</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal title="上架奖励" onClose={() => setShowForm(false)}>
          <label>名称</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="field-row">
            <div><label>类型</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {TYPES.map((t) => <option key={t[0]} value={t[0]}>{t[1]}</option>)}
              </select>
            </div>
            <div><label>所需积分</label><input type="number" value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })} /></div>
            <div><label>库存数量</label><input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></div>
          </div>
          <label>说明</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="btn-row">
            <button onClick={create} disabled={!form.name}>上架</button>
            <button className="btn-ghost" onClick={() => setShowForm(false)}>取消</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
