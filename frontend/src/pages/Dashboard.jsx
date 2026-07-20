import React from "react";
import AgentDashboard from "../components/AgentDashboard";
import SuperuserDashboard from "../components/SuperuserDashboard";
import CompanyDashboard from "../components/CompanyDashboard";

const Dashboard = ({ user, onLogout }) => {
  if (user.role === "superuser") return <SuperuserDashboard user={user} onLogout={onLogout} />;
  if (user.role === "company") return <CompanyDashboard user={user} onLogout={onLogout} />;
  if (user.role === "agent") return <AgentDashboard user={user} onLogout={onLogout} />;
  return <AgentDashboard user={user} onLogout={onLogout} />;
};

export default Dashboard;
