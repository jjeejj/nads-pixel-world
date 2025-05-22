import { hardhat } from 'wagmi/chains';
// 网络配置
export const MONAD_TESTNET = {
    id: 10143,
    name: 'Monad Test',
    network: 'monad-testnet',
    nativeCurrency: {
        decimals: 18,
        name: 'Monad',
        symbol: 'MON',
    },
    rpcUrls: {
        default: {
            http: ['https://testnet-rpc.monad.xyz'],
        },
        public: {
            http: ['https://testnet-rpc.monad.xyz'],
        },
    },
    blockExplorers: {
        default: {
            name: 'Monad Explorer',
            url: 'https://testnet.monadexplorer.com'
        },
    },
    testnet: true,
};

// 创建Anvil本地链配置
export const ANVIL_CHAIN = {
    ...hardhat,
    name: 'Anvil',
    network: 'anvil',
    rpcUrls: {
        default: {
            http: ['http://127.0.0.1:8545'],
        },
        public: {
            http: ['http://127.0.0.1:8545'],
        },
    },
};

// 合约地址配置
export const CONTRACT_CONFIG = {
    // 本地开发环境
    development: {
        address: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512", // Hardhat默认部署地址
        chainId: 31337, // Hardhat本地网络ID
    },
    // 测试网环境
    production: {
        // address: "0xf276667Bb7E4907c65F0C70A6337a0d7eE8039e7", // 替换为实际在Monad测试网上的合约地址， 这个是有测试数据的 
        address: "0xd918d63D91bd731C866A35A4c3252E78F577503c",
        chainId: 10143, // Monad测试网ID
    }
};

// 判断当前环境
export const isProduction = () => {
    return process.env.NODE_ENV === 'production';
};

// 获取当前环境的合约配置
export const getContractConfig = () => {
    return isProduction() ? CONTRACT_CONFIG.production : CONTRACT_CONFIG.development;
}; 