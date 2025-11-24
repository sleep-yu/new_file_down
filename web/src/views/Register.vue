<template>
  <div class="register-container">
    <div class="register-box">
      <div class="logo-section">
        <div class="logo-icon">📁</div>
        <h1 class="register-title">文件下载系统</h1>
        <p class="register-subtitle">创建您的账户</p>
      </div>

      <form class="register-form" @submit.prevent="handleRegister">
        <!-- 用户名 -->
        <div class="form-group">
          <label for="username">
            <span class="label-icon">👤</span>
            用户名
          </label>
          <input id="username" v-model="formData.username" type="text" placeholder="请输入用户名（4-20位字母或数字）"
            :class="{ error: errors.username }" />
          <span v-if="errors.username" class="error-text">
            {{ errors.username }}
          </span>
        </div>

        <!-- 密码 -->
        <div class="form-group">
          <label for="password">
            <span class="label-icon">🔒</span>
            密码
          </label>
          <input id="password" v-model="formData.password" type="password" placeholder="请输入密码（至少8位，包含字母和数字）"
            :class="{ error: errors.password }" />
          <span v-if="errors.password" class="error-text">
            {{ errors.password }}
          </span>
        </div>

        <!-- 确认密码 -->
        <div class="form-group">
          <label for="confirmPassword">
            <span class="label-icon">🔑</span>
            确认密码
          </label>
          <input id="confirmPassword" v-model="formData.confirmPassword" type="password" placeholder="请再次输入密码"
            :class="{ error: errors.confirmPassword }" />
          <span v-if="errors.confirmPassword" class="error-text">
            {{ errors.confirmPassword }}
          </span>
        </div>

        <!-- 验证码 -->
        <div class="form-group">
          <label for="captcha">
            <span class="label-icon">🔢</span>
            验证码
          </label>
          <div class="captcha-wrapper">
            <input id="captcha" v-model="formData.captcha" type="text" placeholder="请输入验证码"
              :class="{ error: errors.captcha }" maxlength="4" />
            <div class="captcha-image" @click="refreshCaptcha">
              <img v-if="captchaImage" :src="captchaImage" alt="验证码" />
              <span v-else class="captcha-loading">加载中...</span>
            </div>
          </div>
          <span v-if="errors.captcha" class="error-text">
            {{ errors.captcha }}
          </span>
          <span class="captcha-tip">看不清？点击图片刷新</span>
        </div>

        <!-- 错误提示 -->
        <div v-if="errorMessage" class="error-message">
          ⚠️ {{ errorMessage }}
        </div>

        <!-- 成功提示 -->
        <div v-if="successMessage" class="success-message">
          ✅ {{ successMessage }}
        </div>

        <!-- 注册按钮 -->
        <button type="submit" class="register-button" :disabled="loading">
          <span v-if="!loading">注 册</span>
          <span v-else class="loading">
            <span class="loading-spinner"></span>
            注册中...
          </span>
        </button>
      </form>

      <div class="register-footer">
        <p>已有账户？<router-link to="/login" class="login-link">立即登录</router-link></p>
      </div>
    </div>

    <!-- 装饰元素 -->
    <div class="decoration decoration-1"></div>
    <div class="decoration decoration-2"></div>
    <div class="decoration decoration-3"></div>
  </div>
</template>


<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
const router = useRouter();
// 表单数据
const formData = ref({
  username:'',
  password:'',
  confirmPassword: '',
  captcha:''
})

// 错误信息
const errors = ref({
  username:'',
  password:'',
  confirmPassword: '',
  captcha:''
})

const errorMessage = ref('');
const successMessage = ref('');
const loading = ref(false);
const captchaImage = ref('');
const captchaId = ref('');

// 获取验证码
const fetchCaptcha = async ()=>{
  
}
</script>

<style scoped>
.register-container {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100vw;
  height: 100vh;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  overflow: hidden;
}

/* 装饰元素 */
.decoration {
  position: absolute;
  border-radius: 50%;
  opacity: 0.1;
  background: white;
}

.decoration-1 {
  width: 300px;
  height: 300px;
  top: -100px;
  left: -100px;
}

.decoration-2 {
  width: 200px;
  height: 200px;
  bottom: -50px;
  right: 10%;
}

.decoration-3 {
  width: 150px;
  height: 150px;
  top: 20%;
  right: -50px;
}

.register-box {
  position: relative;
  z-index: 1;
  background: white;
  padding: 50px 40px;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 500px;
  max-height: 95vh;
  overflow-y: auto;
  animation: slideUp 0.5s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.logo-section {
  text-align: center;
  margin-bottom: 40px;
}

.logo-icon {
  font-size: 60px;
  margin-bottom: 15px;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {

  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-10px);
  }
}

.register-title {
  font-size: 32px;
  font-weight: bold;
  color: #333;
  margin-bottom: 10px;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.register-subtitle {
  color: #666;
  font-size: 14px;
}

.register-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.label-icon {
  font-size: 18px;
}

.form-group input {
  padding: 14px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  font-size: 15px;
  transition: all 0.3s;
  background: #f8f9fa;
}

.form-group input:focus {
  outline: none;
  border-color: #f093fb;
  background: white;
  box-shadow: 0 0 0 4px rgba(240, 147, 251, 0.1);
}

.form-group input.error {
  border-color: #f56565;
  background: #fff5f5;
}

.error-text {
  font-size: 13px;
  color: #f56565;
  margin-top: -5px;
}

/* 验证码样式 */
.captcha-wrapper {
  display: flex;
  gap: 12px;
  align-items: center;
}

.captcha-wrapper input {
  flex: 1;
}

.captcha-image {
  width: 120px;
  height: 40px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
}

.captcha-image:hover {
  border-color: #f093fb;
  box-shadow: 0 0 0 3px rgba(240, 147, 251, 0.1);
}

.captcha-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.captcha-loading {
  font-size: 12px;
  color: #999;
}

.captcha-tip {
  font-size: 12px;
  color: #999;
  margin-top: -5px;
}

.error-message {
  padding: 14px;
  background-color: #fff5f5;
  border: 2px solid #feb2b2;
  border-radius: 10px;
  color: #c53030;
  font-size: 14px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.success-message {
  padding: 14px;
  background-color: #f0fff4;
  border: 2px solid #9ae6b4;
  border-radius: 10px;
  color: #22543d;
  font-size: 14px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.register-button {
  padding: 16px;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  margin-top: 10px;
}

.register-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(240, 147, 251, 0.4);
}

.register-button:active:not(:disabled) {
  transform: translateY(0);
}

.register-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.register-footer {
  margin-top: 30px;
  text-align: center;
  font-size: 14px;
  color: #666;
}

.login-link {
  color: #f093fb;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.3s;
}

.login-link:hover {
  color: #f5576c;
  text-decoration: underline;
}

/* 响应式设计 */
@media (max-width: 600px) {
  .register-box {
    padding: 40px 30px;
    width: 95%;
  }

  .register-title {
    font-size: 28px;
  }

  .logo-icon {
    font-size: 50px;
  }

  .captcha-wrapper {
    flex-direction: column;
    align-items: stretch;
  }

  .captcha-image {
    width: 100%;
  }
}
</style>
