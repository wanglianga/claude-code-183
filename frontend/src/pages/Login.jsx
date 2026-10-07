import React, { useState } from 'react';
import { Button, Card, Form, Input, Typography, Alert } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', values);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #fff7e6 0%, #fff1f0 100%)',
      }}
    >
      <Card style={{ width: 400, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <Typography.Title level={3} style={{ textAlign: 'center', color: '#d4380d' }}>
          银龄志愿服务平台
        </Typography.Title>
        <Typography.Paragraph style={{ textAlign: 'center', color: '#888' }}>
          城市社区老年志愿者报名 · 排班 · 积分 · 关怀一体化
        </Typography.Paragraph>
        <Form onFinish={onFinish} size="large">
          <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            登 录
          </Button>
        </Form>
        <Alert
          style={{ marginTop: 16 }}
          type="info"
          message="演示账号"
          description={
            <div style={{ fontSize: 12 }}>
              社区工作人员：admin / admin123
              <br />
              志愿者：wangxiulan / 123456（另有 lijianguo、zhangguifang、liudehai、chenmeiling）
            </div>
          }
        />
      </Card>
    </div>
  );
}
