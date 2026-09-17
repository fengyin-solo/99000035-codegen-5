const jwt = require('jsonwebtoken');

const JWT_SECRET = 'link-collector-secret-key';

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未提供登录凭证，请先登录', code: 'NO_TOKEN' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: '登录状态已过期，请重新登录', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: '登录凭证无效，请重新登录', code: 'TOKEN_INVALID' });
  }
}

module.exports = { authMiddleware, JWT_SECRET };
