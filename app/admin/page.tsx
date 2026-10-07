import { isAdmin } from "@/lib/server";
import { redirect } from "next/navigation";
import Dashboard from "@/components/dashboard";
import { SiteHeader } from "@/components/site-header";
export const dynamic="force-dynamic";
export default async function Admin(){if(!await isAdmin())redirect("/admin/login");return <Dashboard/>;}
