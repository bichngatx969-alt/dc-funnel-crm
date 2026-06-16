import {
  GET as handleGet,
  POST as handlePost,
} from "@/app/api/webhook/facebook/route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = handleGet;
export const POST = handlePost;
