import {
  getHostingFeature,
} from "@/lib/hosting-features";

type Props = {
  features:
    unknown;
};

function Field({
  name,
  label,
  value,
  placeholder,
}: {
  name: string;
  label: string;
  value: string;
  placeholder?: string;
}) {
  return (
    <label>
      <span className="label">
        {label}
      </span>

      <input
        name={
          name
        }
        className="field"
        defaultValue={
          value
        }
        placeholder={
          placeholder
        }
      />
    </label>
  );
}

function YesNoField({
  name,
  label,
  value,
}: {
  name: string;
  label: string;
  value: string;
}) {
  return (
    <label>
      <span className="label">
        {label}
      </span>

      <select
        name={
          name
        }
        className="field"
        defaultValue={
          value ===
            "Tak" ||
          value ===
            "Nie"
            ? value
            : ""
        }
      >
        <option value="">
          Nie określono
        </option>

        <option value="Tak">
          Tak
        </option>

        <option value="Nie">
          Nie
        </option>
      </select>
    </label>
  );
}

export function HostingFeaturesFields({
  features,
}: Props) {
  const get = (
    key: string,
  ) =>
    getHostingFeature(
      features,
      key,
    );

  return (
    <section className="border-b border-[#eceef2] p-6">
      <div>
        <div className="text-sm font-[680]">
          Parametry Hosting WWW
        </div>

        <p className="mt-1 max-w-3xl text-xs leading-5 text-[#98a2b3]">
          Wypełniaj zwykłe pola.
          Narzivo automatycznie
          zbuduje z nich Parametry
          JSON używane przez
          ranking i porównywarkę.
        </p>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <Field
          name="hosting_dysk"
          label="Dysk"
          value={get(
            "dysk",
          )}
          placeholder="np. 50 GB NVMe"
        />

        <Field
          name="hosting_dysk_maksymalny"
          label="Maksymalny dysk"
          value={get(
            "dysk_maksymalny",
          )}
          placeholder="np. do 1 TB"
        />

        <Field
          name="hosting_technologia_dysku"
          label="Technologia dysku"
          value={get(
            "technologia_dysku",
          )}
          placeholder="np. NVMe"
        />

        <Field
          name="hosting_ram"
          label="RAM"
          value={get(
            "ram",
          )}
          placeholder="np. 8 GB"
        />

        <Field
          name="hosting_ram_maksymalny"
          label="Maksymalny RAM"
          value={get(
            "ram_maksymalny",
          )}
          placeholder="np. do 64 GB"
        />

        <Field
          name="hosting_cpu"
          label="CPU"
          value={get(
            "cpu",
          )}
          placeholder="np. 4 vCPU / 3 GHz"
        />

        <Field
          name="hosting_cpu_maksymalny"
          label="Maksymalny CPU"
          value={get(
            "cpu_maksymalny",
          )}
          placeholder="np. do 16 vCPU"
        />

        <Field
          name="hosting_transfer"
          label="Transfer"
          value={get(
            "transfer",
          )}
          placeholder="np. Bez limitu"
        />

        <Field
          name="hosting_strony_www"
          label="Strony WWW"
          value={get(
            "strony_www",
          )}
          placeholder="np. Do 100"
        />

        <Field
          name="hosting_konta_email"
          label="Konta e-mail"
          value={get(
            "konta_email",
          )}
          placeholder="np. Bez limitu"
        />

        <Field
          name="hosting_bazy_mysql"
          label="Bazy MySQL"
          value={get(
            "bazy_mysql",
          )}
          placeholder="np. Do 100"
        />

        <Field
          name="hosting_konta_ftp"
          label="Konta FTP"
          value={get(
            "konta_ftp",
          )}
          placeholder="np. Do 100"
        />

        <Field
          name="hosting_backup"
          label="Backup"
          value={get(
            "backup",
          )}
          placeholder="np. Codzienny, 30 dni"
        />

        <Field
          name="hosting_php"
          label="PHP"
          value={get(
            "php",
          )}
          placeholder="np. 8.2–8.5"
        />

        <Field
          name="hosting_okres_testowy"
          label="Okres testowy"
          value={get(
            "okres_testowy",
          )}
          placeholder="np. 14 dni"
        />

        <Field
          name="hosting_lokalizacja"
          label="Lokalizacja"
          value={get(
            "lokalizacja",
          )}
          placeholder="np. Polska"
        />

        <Field
          name="hosting_sla"
          label="SLA"
          value={get(
            "sla",
          )}
          placeholder="np. 99,9%"
        />

        <YesNoField
          name="hosting_ssl"
          label="SSL"
          value={get(
            "ssl",
          )}
        />

        <YesNoField
          name="hosting_ssh"
          label="SSH"
          value={get(
            "ssh",
          )}
        />

        <YesNoField
          name="hosting_redis"
          label="Redis"
          value={get(
            "redis",
          )}
        />

        <YesNoField
          name="hosting_http3"
          label="HTTP/3"
          value={get(
            "http3",
          )}
        />

        <YesNoField
          name="hosting_waf"
          label="WAF"
          value={get(
            "waf",
          )}
        />

        <YesNoField
          name="hosting_antyddos"
          label="Anty-DDoS"
          value={get(
            "antyddos",
          )}
        />

        <Field
          name="hosting_migracja"
          label="Migracja"
          value={get(
            "migracja",
          )}
          placeholder="np. Bezpłatna"
        />
      </div>
    </section>
  );
}