"use client";
import { PageHeader, Card } from "@/components";
import NotificationSettingsForm from "@/components/settings/NotificationSettingsForm";

export default function NotificationsPage() {
  return (
    <div className="min-w-0">
      <PageHeader
        title="Notifications"
        breadcrumbs={["Website", "Forms"]}
        description="Dashboard banner messages (GET /setting/getnotification, POST /setting/updatenotification)"
      />
      <Card title="Maintenance / announcement messages" className="max-w-xl">
        <NotificationSettingsForm />
      </Card>
    </div>
  );
}
