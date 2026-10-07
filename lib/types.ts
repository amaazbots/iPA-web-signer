export type Certificate = { id: string; name: string; notes: string; enabled: number; status: string; expires_at: string | null; team_id: string | null; profile_type: string; created_at: number; };
export type AdPlacement = { enabled: boolean; provider: string; html: string; };
export type AdSettings = AdPlacement & { result: AdPlacement; };
export type AppMetadata = { bundleId: string; originalBundleId?: string; title: string; version: string; profileType: string; needsBundleCleanup?: boolean; };
export const DEFAULT_ADS: AdSettings = {
  enabled: true,
  provider: "Adcash",
  html: `<script id="aclib" type="text/javascript" src="https://ascdn.com/script/aclib.js"></script>
<div style="width:300px;height:250px">
  <script type="text/javascript">
    aclib.runBanner({ zoneId: '12275702' });
  </script>
</div>`,
  result: {
    enabled: true,
    provider: "Adcash",
    html: `<script id="aclib" type="text/javascript" src="https://ascdn.com/script/aclib.js"></script>
<div style="width:300px;height:100px">
  <script type="text/javascript">
    aclib.runBanner({ zoneId: '12275794' });
  </script>
</div>`,
  },
};

// Preserve saved sidebar tags when upgrading settings created before the second placement.
export function normalizeAdSettings(saved?: Partial<AdSettings> | null): AdSettings {
  return { ...DEFAULT_ADS, ...saved, result: { ...DEFAULT_ADS.result, ...saved?.result } };
}
