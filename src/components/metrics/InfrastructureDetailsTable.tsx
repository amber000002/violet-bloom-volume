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
   source: "campaign" | "postmaster" | "both";
   serviceProvider?: string;
   latestReputation?: string;
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
   
   // Handle various formats: "Name <email@domain.com>", "email@domain.com"
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
 
 export const InfrastructureDetailsTable: React.FC<InfrastructureDetailsTableProps> = ({
   campaignData,
   postmasterData,
 }) => {
   // Extract unique domains and IPs
   const { domains, ips } = useMemo(() => {
     const domainMap = new Map<string, DomainInfo>();
     const ipMap = new Map<string, IPInfo>();
 
     // Extract domains from campaign data (from "Title" or any from address field)
     // Using serviceProvider as the domain source since it often contains sender info
     campaignData.forEach((row) => {
       // Check various fields for domain info
       const fromDomain = extractDomainFromEmail(row.title) || 
                          extractDomainFromEmail(row.campaignName);
       
       if (row.serviceProvider) {
         const existingDomain = domainMap.get(row.serviceProvider.toLowerCase());
         if (!existingDomain) {
           domainMap.set(row.serviceProvider.toLowerCase(), {
             domain: row.serviceProvider,
             source: "campaign",
             serviceProvider: row.providerName || undefined,
           });
         }
       }
     });
 
     // Extract domains from postmaster data and get latest reputation
     if (postmasterData && postmasterData.length > 0) {
       // Sort by date to get latest
       const sorted = [...postmasterData].sort((a, b) => {
         const dateA = new Date(a.date.split("/").reverse().join("-"));
         const dateB = new Date(b.date.split("/").reverse().join("-"));
         return dateB.getTime() - dateA.getTime();
       });
 
       // Get latest reputation for each domain
       const latestDomainRep = new Map<string, { reputation: string; date: string }>();
       const latestIPRep = new Map<string, { reputation: string; date: string }>();
 
       sorted.forEach((row) => {
         const domainKey = row.domain?.toLowerCase().trim();
         if (domainKey && !latestDomainRep.has(domainKey)) {
           latestDomainRep.set(domainKey, {
             reputation: row.domainReputation,
             date: row.date,
           });
         }
 
         // Get IP reputation
         if (row.sampleIps && !latestIPRep.has(row.sampleIps)) {
           latestIPRep.set(row.sampleIps, {
             reputation: row.ipReputation,
             date: row.date,
           });
         }
       });
 
       // Add postmaster domains
       postmasterData.forEach((row) => {
         if (row.domain) {
           const domainKey = row.domain.toLowerCase().trim();
           const existing = domainMap.get(domainKey);
           const latestRep = latestDomainRep.get(domainKey);
 
           if (existing) {
             existing.source = "both";
             existing.latestReputation = latestRep?.reputation;
             existing.reputationDate = latestRep?.date;
           } else {
             domainMap.set(domainKey, {
               domain: row.domain,
               source: "postmaster",
               latestReputation: latestRep?.reputation,
               reputationDate: latestRep?.date,
             });
           }
         }
 
         // Extract IPs
         if (row.sampleIps) {
           const ips = row.sampleIps.split(/[,;]/).map(ip => ip.trim()).filter(Boolean);
           ips.forEach((ip) => {
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
       className="space-y-6"
     >
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
                 <TableHead>Domain / Service Provider</TableHead>
                 <TableHead>Source</TableHead>
                 <TableHead>Provider Name</TableHead>
                 <TableHead>Latest Reputation</TableHead>
                 <TableHead>As of Date</TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
               {domains.map((d, i) => {
                 const badge = getReputationBadge(d.latestReputation || "");
                 const IconComponent = badge.icon;
                 
                 return (
                   <TableRow key={i}>
                     <TableCell className="font-medium">{d.domain}</TableCell>
                     <TableCell>
                       <Badge variant="outline" className="text-xs">
                         {d.source === "both" ? "Campaign + Postmaster" : 
                          d.source === "campaign" ? "Campaign" : "Postmaster"}
                       </Badge>
                     </TableCell>
                     <TableCell>{d.serviceProvider || "—"}</TableCell>
                     <TableCell>
                       {d.latestReputation ? (
                         <Badge variant={badge.variant} className={badge.className}>
                           {IconComponent && <IconComponent className="w-3 h-3 mr-1" />}
                           {d.latestReputation}
                         </Badge>
                       ) : (
                         <span className="text-muted-foreground">—</span>
                       )}
                     </TableCell>
                     <TableCell className="text-muted-foreground text-sm">
                       {d.reputationDate || "—"}
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
                   <TableHead>IP Count</TableHead>
                   <TableHead>Latest Reputation</TableHead>
                   <TableHead>As of Date</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {ips.map((ip, i) => {
                   const badge = getReputationBadge(ip.latestReputation || "");
                   const IconComponent = badge.icon;
                   
                   return (
                     <TableRow key={i}>
                       <TableCell className="font-mono text-sm">{ip.ip}</TableCell>
                       <TableCell>{ip.count}</TableCell>
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
                       <TableCell className="text-muted-foreground text-sm">
                         {ip.reputationDate || "—"}
                       </TableCell>
                     </TableRow>
                   );
                 })}
               </TableBody>
             </Table>
           </div>
         </div>
       )}
 
       <p className="text-xs text-muted-foreground">
         * Domain reputation from Postmaster CSV. IP details from Postmaster "Sample IPs" field.
       </p>
     </motion.div>
   );
 };