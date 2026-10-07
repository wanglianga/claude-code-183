import React, { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Row,
  Select,
  Switch,
  Table,
  Tabs,
  Tag,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api';

const CATS = ['食堂餐券', '理发券', '体检优惠', '公益荣誉'];

export default function Redemptions() {
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const load = () => {
    api.get('/redemptions/items').then((res) => setItems(res.data));
    api.get('/redemptions/orders').then((res) => setOrders(res.data));
  };
  useEffect(load, []);

  const submit = async () => {
    const values = await form.validateFields();
    if (editing) {
      await api.put(`/redemptions/items/${editing.id}`, values);
      message.success('已保存');
    } else {
      await api.post('/redemptions/items', values);
      message.success('已新增');
    }
    setOpen(false);
    setEditing(null);
    form.resetFields();
    load();
  };

  return (
    <Card>
      <Tabs
        items={[
          {
            key: 'items',
            label: '兑换项目管理',
            children: (
              <>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  style={{ marginBottom: 12 }}
                  onClick={() => {
                    setEditing(null);
                    form.resetFields();
                    setOpen(true);
                  }}
                >
                  新增兑换项目
                </Button>
                <Table
                  rowKey="id"
                  dataSource={items}
                  pagination={false}
                  columns={[
                    { title: '名称', dataIndex: 'name' },
                    { title: '类别', dataIndex: 'category', render: (c) => <Tag color="orange">{c}</Tag> },
                    { title: '所需积分', dataIndex: 'pointsCost' },
                    {
                      title: '库存',
                      dataIndex: 'stock',
                      render: (s) => (s > 0 ? s : <Tag color="red">缺货</Tag>),
                    },
                    {
                      title: '状态',
                      dataIndex: 'active',
                      render: (a) => (a ? <Tag color="green">上架</Tag> : <Tag>下架</Tag>),
                    },
                    { title: '说明', dataIndex: 'description', ellipsis: true },
                    {
                      title: '操作',
                      width: 80,
                      render: (_, r) => (
                        <Button
                          type="link"
                          size="small"
                          onClick={() => {
                            setEditing(r);
                            form.setFieldsValue(r);
                            setOpen(true);
                          }}
                        >
                          编辑
                        </Button>
                      ),
                    },
                  ]}
                />
              </>
            ),
          },
          {
            key: 'orders',
            label: `兑换记录（${orders.length}）`,
            children: (
              <Table
                rowKey="id"
                dataSource={orders}
                columns={[
                  {
                    title: '时间',
                    dataIndex: 'createdAt',
                    render: (t) => dayjs(t).format('YYYY-MM-DD HH:mm'),
                  },
                  { title: '志愿者', dataIndex: 'volunteerName' },
                  { title: '兑换项目', dataIndex: 'itemName' },
                  { title: '消耗积分', dataIndex: 'points' },
                  {
                    title: '结果',
                    render: (_, r) =>
                      r.status === 'fulfilled' ? (
                        <Tag color="green">已兑现</Tag>
                      ) : (
                        <Tag color="red">失败：{r.failReason}</Tag>
                      ),
                  },
                ]}
              />
            ),
          },
        ]}
      />
      <Modal
        title={editing ? '编辑兑换项目' : '新增兑换项目'}
        open={open}
        onOk={submit}
        onCancel={() => setOpen(false)}
      >
        <Form form={form} layout="vertical">
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="category" label="类别" rules={[{ required: true, message: '请选择' }]}>
                <Select options={CATS.map((c) => ({ value: c, label: c }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="pointsCost" label="所需积分" rules={[{ required: true, message: '请输入' }]}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="stock" label="库存" rules={[{ required: true, message: '请输入' }]}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="description" label="说明">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="active" label="上架" valuePropName="checked" initialValue={true}>
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </Card>
  );
}
