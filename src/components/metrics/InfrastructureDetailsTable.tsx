import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { CampaignRow, PostmasterRow } from "@/lib/csvAnalyzer";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Globe, Server, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface InfrastructureDetailsTableProps {
  campaignData: CampaignRow[];
  postmasterData: PostmasterRow[] | null;
}

interface DomainInfo {
  domain: string;
  latestReputation?: string;
  reputationDate?: string;
}

interface IPInfo {
  ip: string;
  latestReputation?: string;
  reputationDate?: string;
}

const getReputationBadge = (reputation: string) => {
  const normalized = reputation?.toLowerCase().trim() || "";
  switch (normalized) {
    case "high":
      return { variant: "default" as const, className: "bg-green-500/20 text-green-600 border-green-500/30", icon: CheckCircle2 };
    case "medium":
      return { variant: "default" as const, className: "bg-amber-500/20 text-amber-600 border-amber-500/30", icon: AlertTriangle };
    case "low":
      return { variant: "default" as const, className: "bg-orange-500/20 text-orange-600 border-orange-500/30", icon: AlertTriangle };
    case "bad":
      return { variant: "destructive" as const, className: "bg-red-500/20 text-red-600 border-red-500/30", icon: AlertTriangle };
    default:
      return { variant: "secondary" as const, className: "", icon: null };
  }
};

// Strip brackets/parens from IP strings
const cleanIP = (ip: string): string => ip.replace(/[[\](){}]/g, "").trim();

export const InfrastructureDetailsTable: React.FC<InfrastructureDetailsTableProps> = ({
  campaignData,
  postmasterData,
}) => {
  const { domains, ips } = useMemo(() => {
    const domainMap = new Map<string, DomainInfo>();
    const ipMap = new Map<string, IPInfo>();

    if (!postmasterData || postmasterData.length === 0) {
      return { domains: [], ips: [] };
    }

    // Sort newest first for "latest" logic
    const sorted = [...postmasterData].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Domains: unique domains from postmaster CSV with latest domain reputation
    sorted.forEach((row) => {
      const domainKey = row.domain?.toLowerCase().trim();
      if (domainKey && !domainMap.has(domainKey)) {
        const rep = row.domainReputation?.trim();
        const isValid = rep && rep.toLowerCase() !== "n/a" && rep !== "";
        domainMap.set(domainKey, {
          domain: row.domain?.trim() || domainKey,
          latestReputation: isValid ? rep : undefined,
          reputationDate: row.date,
        });
      }
    });

    // IPs: all unique IPs from sampleIps, latest recorded reputation
    const ipRepSeen = new Set<string>();
    sorted.forEach((row) => {
      if (!row.sampleIps) return;
      const ipList = row.sampleIps.split(/[,;]/).map((s) => cleanIP(s)).filter(Boolean);
      ipList.forEach((ip) => {
        if (ipRepSeen.has(ip)) return;
        ipRepSeen.add(ip);
        const rep = row.ipReputation?.trim();
        const isValid = rep && rep.toLowerCase() !== "n/a" && rep !== "";
        ipMap.set(ip, {
          ip,
          latestReputation: isValid ? rep : undefined,
          reputationDate: row.date,
        });
      });
    });

    return {
      domains: Array.from(domainMap.values()),
      ips: Array.from(ipMap.values()),
    };
  }, [campaignData, postmasterData]);

  if (domains.length === 0 && ips.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        <p>No infrastructure details available</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className={`grid gap-4 ${ips.length > 0 && domains.length > 0 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
        {/* Domain Details */}
        {domains.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              Domain Details ({domains.length} unique)
            </h4>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Domain</TableHead>
                    <TableHead>Domain Reputation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {domains.map((d, i) => {
                    const badge = getReputationBadge(d.latestReputation || "");
                    const IconComp = badge.icon;
                    return (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{d.domain}</TableCell>
                        <TableCell>
                          {d.latestReputation ? (
                            <Badge variant={badge.variant} className={badge.className}>
                              {IconComp && <IconComp className="w-3 h-3 mr-1" />}
                              {d.latestReputation}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* IP Details */}
        {ips.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Server className="w-4 h-4 text-secondary" />
              IP Details ({ips.length} unique)
            </h4>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Reputation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ips.map((ip, i) => {
                    const badge = getReputationBadge(ip.latestReputation || "");
                    const IconComponent = badge.icon;
                    return (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-sm">{ip.ip}</TableCell>
                        <TableCell>
                          {ip.latestReputation ? (
                            <Badge variant={badge.variant} className={badge.className}>
                              {IconComponent && <IconComponent className="w-3 h-3 mr-1" />}
                              {ip.latestReputation}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        * Domain and IP details sourced from Postmaster CSV data.
      </p>
    </motion.div>
  );
};
