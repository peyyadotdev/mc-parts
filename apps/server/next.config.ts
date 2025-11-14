import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	typedRoutes: true,
	async headers() {
		return [
			{
				// Apply CORS headers to all routes
				source: "/:path*",
				headers: [
					{
						key: "Access-Control-Allow-Credentials",
						value: "true",
					},
					{
						key: "Access-Control-Allow-Origin",
						value: process.env.CORS_ORIGIN || "",
					},
					{
						key: "Access-Control-Allow-Methods",
						value: "GET,POST,OPTIONS",
					},
					{
						key: "Access-Control-Allow-Headers",
						value: "Content-Type, Authorization",
					},
				],
			},
		];
	},
};

export default nextConfig;
