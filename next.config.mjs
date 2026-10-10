/** @type {import('next').NextConfig} */
const isStatic = process.env.GLOWY_MOVE_STATIC === '1';

const nextConfig = {
  reactStrictMode: true,
  // Export estático para hospedagem de arquivos (Hostinger, S3, qualquer CDN).
  // Sem a variável, o build normal roda em servidor Node.
  ...(isStatic ? { output: 'export', trailingSlash: true } : {}),
  images: { unoptimized: true },
  // better-sqlite3 é um binário nativo: precisa ficar fora do bundle do servidor.
  serverExternalPackages: ['better-sqlite3'],
  eslint: {
    // O lint roda como passo próprio (npm run lint) para não duplicar tempo de build.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
