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
import { Globe, Server, Shield, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface InfrastructureDetailsTableProps {
  campaignData: CampaignRow[];
  postmasterData: PostmasterRow[] | null;
}

interface DomainInfo {
  domain: string;
  latestReputation?: string;
  latestIpReputation?: string;
  latestSpamRatio?: number;
  latestErrorRatio?: number;
  reputationDate?: string;
}

interface IPInfo {
  ip: string;
  count: number;
  latestReputation?: string;
  reputationDate?: string;
}

// Extract domain from email address (From field)
const extractDomainFromEmail = (email: string): string | null => {
  if (!email) return null;
  const emailMatch = email.match(/<([^>]+)>/) || email.match(/([^\s]+@[^\s]+)/);
  const emailPart = emailMatch ? emailMatch[1] : email;
  const atIndex = emailPart.indexOf("@");
  if (atIndex === -1) return null;
  const domain = emailPart.substring(atIndex + 1).toLowerCase().trim();
  return domain || null;
};

// Get reputation badge styling
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

const getRatioColor = (value: number, type: "spam" | "error"): string => {
  if (type === "spam") {
    if (value > 0.003) return "text-red-600 font-medium";
    if (value > 0.001) return "text-amber-600 font-medium";
    return "text-green-600";
  }
  // error
  if (value > 0.01) return "text-red-600 font-medium";
  if (value > 0) return "text-amber-600 font-medium";
  return "text-green-600";
};

export const InfrastructureDetailsTable: React.FC<InfrastructureDetailsTableProps> = ({
  campaignData,
  postmasterData,
}) => {
  const { domains, ips } = useMemo(() => {
    const domainMap = new Map<string, DomainInfo>();
    const ipMap = new Map<string, IPInfo>();

    const providerNames = new Set<string>();
    campaignData.forEach((row) => {
      const name = (row.providerName || row.serviceProvider || "").trim();
      if (name) providerNames.add(name);
    });

    // Build latest domain data from postmaster (sorted newest first)
    const latestDomainData = new Map<string, { reputation: string; ipReputation: string; spamRatio: number; errorRatio: number; date: string }>();
    const latestIPRep = new Map<string, { reputation: string; date: string }>();

    if (postmasterData && postmasterData.length > 0) {
      const sorted = [...postmasterData].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      });

      sorted.forEach((row) => {
        const domainKey = row.domain?.toLowerCase().trim();
        if (domainKey && !latestDomainData.has(domainKey)) {
          latestDomainData.set(domainKey, {
            reputation: row.domainReputation,
            ipReputation: row.ipReputation,
            spamRatio: row.spamRatio || 0,
            errorRatio: row.errorRatio || 0,
            date: row.date,
          });
        }
        const ipRep = row.ipReputation?.trim().toLowerCase();
        const isValidIpRep = ipRep && ipRep !== "" && ipRep !== "n/a";
        if (row.sampleIps && isValidIpRep && !latestIPRep.has(row.sampleIps)) {
          latestIPRep.set(row.sampleIps, {
            reputation: row.ipReputation,
            date: row.date,
          });
        }
      });

      postmasterData.forEach((row) => {
        if (row.sampleIps) {
          const ipList = row.sampleIps.split(/[,;]/).map(ip => ip.trim()).filter(Boolean);
          ipList.forEach((ip) => {
            const existing = ipMap.get(ip);
            const latestRep = latestIPRep.get(row.sampleIps);
            if (existing) {
              existing.count = Math.max(existing.count, row.ipCount || 1);
            } else {
              ipMap.set(ip, {
                ip,
                count: row.ipCount || 1,
                latestReputation: latestRep?.reputation,
                reputationDate: latestRep?.date,
              });
            }
          });
        }
      });
    }

    providerNames.forEach((provider) => {
      const providerLower = provider.toLowerCase().trim();
      let matchedData: typeof latestDomainData extends Map<string, infer V> ? V : never | undefined;
      latestDomainData.forEach((data, domainKey) => {
        if (domainKey.includes(providerLower) || providerLower.includes(domainKey)) {
          matchedData = data;
        }
      });
      if (!matchedData) {
        matchedData = latestDomainData.get(providerLower);
      }

      domainMap.set(providerLower, {
        domain: provider,
        latestReputation: matchedData?.reputation,
        latestIpReputation: matchedData?.ipReputation,
        latestSpamRatio: matchedData?.spamRatio,
        latestErrorRatio: matchedData?.errorRatio,
        reputationDate: matchedData?.date,
      });
    });

    latestDomainData.forEach((data, domainKey) => {
      if (!domainMap.has(domainKey)) {
        const originalRow = postmasterData?.find(
          (r) => r.domain?.toLowerCase().trim() === domainKey
        );
        domainMap.set(domainKey, {
          domain: originalRow?.domain || domainKey,
          latestReputation: data.reputation,
          latestIpReputation: data.ipReputation,
          latestSpamRatio: data.spamRatio,
          latestErrorRatio: data.errorRatio,
          reputationDate: data.date,
        });
      }
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
      <div className={`grid gap-4 ${ips.length > 0 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
        {/* Domain Details */}
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
                  <TableHead>IP Reputation</TableHead>
                  <TableHead>Spam Ratio</TableHead>
                  <TableHead>Error Ratio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {domains.map((d, i) => {
                  const ipBadge = getReputationBadge(d.latestIpReputation || "");
                  const IpIcon = ipBadge.icon;
                  return (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{d.domain}</TableCell>
                      <TableCell>
                        {d.latestIpReputation ? (
                          <Badge variant={ipBadge.variant} className={ipBadge.className}>
                            {IpIcon && <IpIcon className="w-3 h-3 mr-1" />}
                            {d.latestIpReputation}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {d.latestSpamRatio !== undefined ? (
                          <span className={getRatioColor(d.latestSpamRatio, "spam")}>
                            {(d.latestSpamRatio * 100).toFixed(2)}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {d.latestErrorRatio !== undefined ? (
                          <span className={getRatioColor(d.latestErrorRatio, "error")}>
                            {(d.latestErrorRatio * 100).toFixed(2)}%
                          </span>
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
        * Domain reputation from Postmaster CSV. IP details from Postmaster "Sample IPs" field.
      </p>
    </motion.div>
  );
};
