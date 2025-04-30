import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ToastProvider } from './components/Toast/useToast';
// RainbowKit和Wagmi配置
import '@rainbow-me/rainbowkit/styles.css';
import {
  RainbowKitProvider,
  getDefaultConfig
} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { hardhat } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MONAD_TESTNET, ANVIL_CHAIN, isProduction } from './config';

// 创建 QueryClient 实例
const queryClient = new QueryClient();

// 根据环境选择链
const chains = isProduction() 
  ? [MONAD_TESTNET] // 生产环境使用Monad Testnet
  : [ANVIL_CHAIN];   // 开发环境使用Anvil本地链

// 配置可用的钱包
const projectId = "DEMO_PROJECT"; // 本地开发用的虚拟ID

// 使用默认配置
const config = getDefaultConfig({
  appName: '像素格子',
  projectId,
  chains,
});

// 添加开发模式提示
console.log('应用正在连接到:', chains[0].name);
console.log('RPC URL:', chains[0].rpcUrls.default.http[0]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <WagmiProvider config={config}>
    <QueryClientProvider client={queryClient}>
      <RainbowKitProvider modalSize="compact">
        <ToastProvider>
          <App />
        </ToastProvider>
      </RainbowKitProvider>
    </QueryClientProvider>
  </WagmiProvider>
);