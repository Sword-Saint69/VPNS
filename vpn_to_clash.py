#!/usr/bin/env python3
"""
vpn_to_clash.py — convert alive proxy URIs into Clash Verge (mihomo) YAML profiles.

Usage:
    python3 vpn_to_clash.py tagged/alive_sword-saint69.txt --out tagged --tag Sword-saint69 --lite 500

Outputs:
    tagged/clash_verge_sword-saint69.yaml       full pool
    tagged/clash_verge_lite_sword-saint69.yaml  evenly-sampled subset (default 500)

Stdlib only (CI has no pyyaml). Every proxy name embeds the tag, so the whole
pool is filterable with one regex ("^Sword-saint69-") for include-all-proxies
groups. Unknown/unsupported transports degrade to TCP exactly as mihomo does,
unusable credentials are dropped instead of poisoning the profile.
"""
import argparse
import base64
import json
import os
import re
import sys
import time
from urllib.parse import parse_qs, unquote, urlsplit

VMESS_CIPHERS = {"auto", "none", "zero", "aes-128-gcm", "chacha20-poly1305"}
SS_CIPHERS = {
    "none", "rc4-md5", "aes-128-cfb", "aes-192-cfb", "aes-256-cfb",
    "aes-128-ctr", "aes-192-ctr", "aes-256-ctr",
    "chacha20", "chacha20-ietf", "chacha20-ietf-poly1305", "xchacha20-ietf-poly1305",
    "aes-128-gcm", "aes-192-gcm", "aes-256-gcm",
    "2022-blake3-aes-128-gcm", "2022-blake3-aes-256-gcm", "2022-blake3-chacha20-poly1305",
}
SSR_CIPHERS = {
    "none", "rc4", "rc4-md5", "aes-128-cfb", "aes-192-cfb", "aes-256-cfb",
    "aes-128-ctr", "aes-192-ctr", "aes-256-ctr", "chacha20", "chacha20-ietf",
    "aes-128-gcm", "aes-192-gcm", "aes-256-gcm",
}
SSR_OBFS = {"plain", "http_simple", "http_post", "random_head", "tls1.2_ticket_auth", "tls1.2_ticket_fastauth"}
SSR_PROTO = {"origin", "auth_sha1_v4", "auth_aes128_md5", "auth_aes128_sha1", "auth_chain_a", "auth_chain_b", "auth_chain_c", "auth_chain_d", "auth_chain_e", "auth_chain_f"}

UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.IGNORECASE)
SID_RE = re.compile(r"^[0-9a-f]{0,16}$", re.IGNORECASE)

STATS = {"mislabeled_ss_vless": 0, "bad_uuid": 0, "bad_pbk": 0, "bad_encryption": 0}


def valid_uuid(value):
    """Standard dashed UUID, or a bare 32-hex token normalized to dashed form."""
    value = value.strip()
    if UUID_RE.match(value):
        return value
    if re.fullmatch(r"[0-9a-f]{32}", value, re.IGNORECASE):
        return "%s-%s-%s-%s-%s" % (value[0:8], value[8:12], value[12:16], value[16:20], value[20:32])
    STATS["bad_uuid"] += 1
    return None


def normalize_pbk(pbk):
    """mihomo decodes REALITY keys with RawURLEncoding (43 chars, no padding).
    Accept that form as-is; re-encode valid 32-byte keys from other bases."""
    pbk = pbk.strip()
    if re.fullmatch(r"[A-Za-z0-9_-]{43}", pbk):
        return pbk
    try:
        raw = b64(pbk)
    except Exception:
        raw = None
    if raw and len(raw) == 32:
        return base64.urlsafe_b64encode(raw).decode().rstrip("=")
    STATS["bad_pbk"] += 1
    return None

RULES = [
    "DOMAIN-SUFFIX,local,DIRECT",
    "IP-CIDR,127.0.0.0/8,DIRECT,no-resolve",
    "IP-CIDR,10.0.0.0/8,DIRECT,no-resolve",
    "IP-CIDR,172.16.0.0/12,DIRECT,no-resolve",
    "IP-CIDR,192.168.0.0/16,DIRECT,no-resolve",
    "IP-CIDR,100.64.0.0/10,DIRECT,no-resolve",
    "IP-CIDR6,fc00::/7,DIRECT,no-resolve",
    "GEOIP,CN,DIRECT",
    "MATCH,__TAG__",
]


def b64(data):
    """Tolerant base64: drop chars outside the alphabet (scraped links smuggle
    HTML fragments into payloads), accept urlsafe, pad as needed."""
    s = re.sub(r"[^A-Za-z0-9+/=_-]", "", data.strip())
    s = s.replace("-", "+").replace("_", "/")
    s += "=" * (-len(s) % 4)
    return base64.b64decode(s)


def norm(line):
    return line.replace("&amp;", "&").strip()


def qget(q, *keys, default=None):
    for k in keys:
        v = q.get(k)
        if v and v[0]:
            return v[0]
    return default


def as_int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def split_alpn(value):
    return [a for a in value.replace(",", " ").split() if a]


def host_port(hostport):
    """'1.2.3.4:443' | '[2606::1]:443' -> (host, port_int)"""
    hostport = hostport.strip()
    if hostport.startswith("["):
        host, _, rest = hostport[1:].partition("]")
        return host, as_int(rest.lstrip(":"))
    host, _, port = hostport.rpartition(":")
    return host, as_int(port)


def apply_network(d, net, path, host, service_name=None, mode=None):
    """Map a share-link transport onto mihomo network + opts. Unknown -> tcp."""
    net = (net or "tcp").lower()
    if path:
        path = unquote(path)
    if net in ("ws", "httpupgrade"):
        d["network"] = "ws"
        opt = {}
        if path:
            opt["path"] = path
        if host:
            opt["headers"] = {"Host": host}
        if net == "httpupgrade":
            opt["v2ray-http-upgrade"] = True
            opt["v2ray-http-upgrade-fast-open"] = True
        if opt:
            d["ws-opts"] = opt
    elif net == "grpc":
        d["network"] = "grpc"
        sn = service_name or path
        if sn:
            d["grpc-opts"] = {"grpc-service-name": sn}
    elif net == "http":
        d["network"] = "http"
        opt = {}
        if path:
            opt["path"] = [path]
        if host:
            opt["headers"] = {"Host": [host]}
        if opt:
            d["http-opts"] = opt
    elif net == "h2":
        d["network"] = "h2"
        opt = {}
        if path:
            opt["path"] = path
        if host:
            opt["host"] = [host]
        if opt:
            d["h2-opts"] = opt
    elif net == "xhttp":
        d["network"] = "xhttp"
        opt = {}
        if path:
            opt["path"] = path
        if host:
            opt["host"] = host
        if mode in ("auto", "stream-one", "stream-up", "packet-up"):
            opt["mode"] = mode
        if opt:
            d["xhttp-opts"] = opt
    else:
        d["network"] = "tcp"


def from_vmess(uri):
    try:
        v = json.loads(b64(uri[8:]).decode("utf-8", "ignore"))
    except Exception:
        return None
    server = v.get("add")
    port = as_int(v.get("port"))
    uuid = valid_uuid(str(v.get("id") or ""))
    if not server or not port or not uuid:
        return None
    d = {
        "type": "vmess", "server": server, "port": port, "uuid": uuid,
        "alterId": as_int(v.get("aid")), "udp": True,
    }
    scy = (v.get("scy") or "").lower()
    d["cipher"] = scy if scy in VMESS_CIPHERS else "auto"
    tls_on = v.get("tls") in ("tls", True)
    host = v.get("host")
    if tls_on:
        d["tls"] = True
        sn = v.get("sni") or host
        if sn:
            d["servername"] = sn
    if v.get("fp"):
        d["client-fingerprint"] = v["fp"]
    if v.get("alpn"):
        d["alpn"] = split_alpn(str(v["alpn"]))
    net = (v.get("net") or "tcp").lower()
    typ = (v.get("type") or "").lower()
    if net == "tcp" and typ == "http":
        d["network"] = "http"
        opt = {}
        if v.get("path"):
            opt["path"] = [unquote(v["path"])]
        if host:
            opt["headers"] = {"Host": [host]}
        if opt:
            d["http-opts"] = opt
    else:
        apply_network(d, net, v.get("path"), host)
    return d


def from_vless(uri):
    u = urlsplit(uri)
    uuid = valid_uuid(unquote(u.username or ""))
    server = u.hostname
    port = u.port
    if not uuid or not server or not port:
        return None
    q = parse_qs(u.query)
    d = {"type": "vless", "server": server, "port": port, "uuid": uuid, "udp": True}
    security = (qget(q, "security", default="none") or "none").lower()
    flow = qget(q, "flow")
    if flow:
        d["flow"] = flow
    pe = qget(q, "packetEncoding", "packet-encoding")
    if pe and pe.lower() != "none":
        d["packet-encoding"] = pe
    enc = qget(q, "encryption")
    if enc and enc.lower() != "none":
        # Some sources advertise experimental VLESS encryption; mihomo only
        # loads strings it can parse, and a mismatch breaks the whole file.
        STATS["bad_encryption"] += 1
        return None
    host = qget(q, "host")
    sni = qget(q, "sni")
    if security in ("tls", "reality"):
        d["tls"] = True
        sn = sni or host
        if sn:
            d["servername"] = sn
    if security == "reality":
        pbk = qget(q, "pbk")
        pbk = normalize_pbk(pbk) if pbk else None
        if not pbk:
            return None
        sid = qget(q, "sid", default="") or ""
        if not SID_RE.match(sid):
            sid = ""
        d["reality-opts"] = {"public-key": pbk, "short-id": sid}
    elif sni:
        d["servername"] = sni
    fp = qget(q, "fp")
    if fp:
        d["client-fingerprint"] = fp
    if qget(q, "allowInsecure", "insecure") in ("1", "true"):
        d["skip-cert-verify"] = True
    alpn = qget(q, "alpn")
    if alpn:
        d["alpn"] = split_alpn(alpn)
    apply_network(
        d,
        qget(q, "type", "network", default="tcp"),
        qget(q, "path"),
        host,
        service_name=qget(q, "serviceName", "servicename"),
        mode=qget(q, "mode"),
    )
    return d


def from_trojan(uri):
    u = urlsplit(uri)
    password = unquote(u.username or "")
    server = u.hostname
    port = u.port
    if not password or not server or not port:
        return None
    q = parse_qs(u.query)
    d = {"type": "trojan", "server": server, "port": port, "password": password, "udp": True}
    host = qget(q, "host")
    sn = qget(q, "sni", "peer") or host
    if sn:
        d["servername"] = sn
    if qget(q, "allowInsecure", "insecure") in ("1", "true"):
        d["skip-cert-verify"] = True
    fp = qget(q, "fp")
    if fp:
        d["client-fingerprint"] = fp
    alpn = qget(q, "alpn")
    if alpn:
        d["alpn"] = split_alpn(alpn)
    apply_network(
        d,
        qget(q, "type", "network", default="tcp"),
        qget(q, "path"),
        host,
        service_name=qget(q, "serviceName", "servicename"),
    )
    return d


def from_ss(uri):
    rest = uri[5:].split("#", 1)[0]
    q = {}
    query = ""
    if "?" in rest:
        rest, query = rest.split("?", 1)
        q = parse_qs(query, keep_blank_values=True)

    if "@" in rest:
        userinfo, hostport = rest.rsplit("@", 1)
    else:
        try:
            decoded = b64(rest).decode("utf-8", "ignore")
        except Exception:
            return None
        if "@" not in decoded:
            return None
        userinfo, hostport = decoded.rsplit("@", 1)

    if ":" in userinfo:
        cipher, password = userinfo.split(":", 1)
    elif UUID_RE.match(unquote(userinfo)):
        # ss:// link whose userinfo is a UUID: an SS link cannot look like this,
        # and the query carries vless transport params (type/security/host/path).
        # The source mislabeled a vless link — reparse the original scheme away.
        STATS["mislabeled_ss_vless"] += 1
        return from_vless("vless://" + userinfo + "@" + hostport + ("?" + query if query else ""))
    else:
        try:
            decoded_user = b64(userinfo).decode("utf-8", "ignore")
        except Exception:
            return None
        if ":" not in decoded_user:
            return None
        cipher, password = decoded_user.split(":", 1)

    server, port = host_port(hostport)
    cipher = (cipher or "").lower()
    if not server or not port or cipher not in SS_CIPHERS or not password:
        return None
    d = {
        "type": "ss", "server": server, "port": port,
        "cipher": cipher, "password": unquote(password), "udp": True,
    }
    plugin = qget(q, "plugin")
    if plugin:
        parts = plugin.split(";")
        pname = parts[0].strip()
        popts = {}
        for kv in parts[1:]:
            if "=" in kv:
                k, v = kv.split("=", 1)
                popts[k.strip()] = v
            elif kv.strip():
                popts[kv.strip()] = True
        if pname in ("obfs-local", "simple-obfs"):
            po = {}
            if popts.get("obfs"):
                po["mode"] = popts["obfs"]
            if popts.get("obfs-host"):
                po["host"] = popts["obfs-host"]
            d["plugin"] = "obfs"
            d["plugin-opts"] = po
        elif pname == "v2ray-plugin":
            po = {}
            if popts.get("mode") == "websocket":
                po["mode"] = "websocket"
            if popts.get("path"):
                po["path"] = popts["path"]
            if popts.get("host"):
                po["host"] = popts["host"]
            if "tls" in popts:
                po["tls"] = True
            d["plugin"] = "v2ray-plugin"
            d["plugin-opts"] = po
        else:
            return None
    return d


def _parse_ssr_spec(spec):
    body, _, param_str = spec.partition("/?")
    parts = body.split(":")
    if len(parts) != 6:
        return None
    server, port_s, protocol, cipher, obfs, pwd_b64 = parts
    port = as_int(port_s)
    cipher = cipher.lower()
    if not server or not port or cipher not in SSR_CIPHERS:
        return None
    if protocol not in SSR_PROTO or obfs not in SSR_OBFS:
        return None
    try:
        password = b64(pwd_b64).decode("utf-8", "ignore")
    except Exception:
        return None
    q = parse_qs(param_str) if param_str else {}
    d = {
        "type": "ssr", "server": server, "port": port, "cipher": cipher,
        "password": password, "protocol": protocol, "obfs": obfs, "udp": True,
    }
    for src, dst in (("obfsparam", "obfs-param"), ("protoparam", "protocol-param")):
        raw = qget(q, src)
        if not raw:
            continue
        try:
            d[dst] = b64(raw).decode("utf-8", "ignore")
        except Exception:
            d[dst] = raw
    return d


def from_ssr(uri):
    raw = uri[6:].split("#", 1)[0]
    candidates = []
    if ":" in raw:
        # some sources ship the ssr spec unencoded (human-readable)
        candidates.append(raw)
    try:
        decoded = b64(raw).decode("utf-8", "ignore")
        if decoded not in candidates:
            candidates.append(decoded)
    except Exception:
        pass
    for spec in candidates:
        d = _parse_ssr_spec(spec)
        if d:
            return d
    return None


def from_hy2(uri):
    u = urlsplit(uri)
    password = unquote(u.username or "")
    server = u.hostname
    port = u.port
    if not password or not server or not port:
        return None
    q = parse_qs(u.query)
    d = {"type": "hysteria2", "server": server, "port": port, "password": password, "udp": True}
    sni = qget(q, "sni", "peer")
    if sni:
        d["sni"] = sni
    if qget(q, "allowInsecure", "insecure") in ("1", "true"):
        d["skip-cert-verify"] = True
    obfs = qget(q, "obfs")
    if obfs:
        d["obfs"] = obfs
    obfs_pw = qget(q, "obfs-password", "obfs_password")
    if obfs_pw:
        d["obfs-password"] = obfs_pw
    alpn = qget(q, "alpn")
    if alpn:
        d["alpn"] = split_alpn(alpn)
    up = qget(q, "up")
    down = qget(q, "down")
    if up:
        d["up"] = up
    if down:
        d["down"] = down
    return d


def from_tuic(uri):
    u = urlsplit(uri)
    uuid = valid_uuid(unquote(u.username or ""))
    password = unquote(u.password or "")
    server = u.hostname
    port = u.port
    if not uuid or not server or not port:
        return None
    q = parse_qs(u.query)
    d = {"type": "tuic", "server": server, "port": port, "uuid": uuid, "udp": True}
    if password:
        d["password"] = password
    sni = qget(q, "sni", "peer")
    if sni:
        d["sni"] = sni
    if qget(q, "allowInsecure", "allow_insecure", "insecure") in ("1", "true"):
        d["skip-cert-verify"] = True
    cc = qget(q, "congestion_control", "congestion-controller", "congestion_controller", "cc")
    if cc and cc.lower() in ("bbr", "cubic", "new_reno"):
        d["congestion-controller"] = cc.lower()
    urm = qget(q, "udp_relay_mode", "udp-relay-mode")
    if urm and urm.lower() in ("native", "quic"):
        d["udp-relay-mode"] = urm.lower()
    alpn = qget(q, "alpn")
    if alpn:
        d["alpn"] = split_alpn(alpn)
    if qget(q, "reduce_rtt", "reduce-rtt") in ("1", "true"):
        d["reduce-rtt"] = True
    return d


PARSERS = {
    "vmess": from_vmess,
    "vless": from_vless,
    "trojan": from_trojan,
    "ss": from_ss,
    "ssr": from_ssr,
    "hysteria2": from_hy2,
    "hy2": from_hy2,
    "tuic": from_tuic,
}


CTRL_RE = re.compile(r"[\x00-\x1f\x7f-\x9f]")


def yval(v):
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return str(v)
    if isinstance(v, str):
        # json.dumps guarantees YAML-safe quoting; raw UTF-8 for astral chars
        # (surrogate-pair \u escapes are rejected by go-yaml), controls stripped
        return json.dumps(CTRL_RE.sub("", v), ensure_ascii=False)
    if isinstance(v, list):
        return "[" + ", ".join(yval(x) for x in v) + "]"
    if isinstance(v, dict):
        return "{" + ", ".join("%s: %s" % (k, yval(x)) for k, x in v.items()) + "}"
    raise TypeError("cannot emit %r" % (v,))


def sample_evenly(rows, n):
    if n <= 0 or len(rows) <= n:
        return list(rows)
    step = len(rows) / n
    return [rows[min(int(i * step), len(rows) - 1)] for i in range(n)]


def write_profile(path, proxies, protos, tag, unusable, dupes, source):
    ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    out = [
        "# PulseGate - Clash Verge / mihomo profile",
        "# generated: %s" % ts,
        "# source: %s" % source,
        "# proxies: %d" % len(proxies),
        "# dropped: %d unusable, %d semantic duplicates" % (unusable, dupes),
        "# import: Clash Verge -> Profiles -> + -> Import from URL/File",
        "",
        "mixed-port: 7890",
        "allow-lan: false",
        "mode: rule",
        "log-level: warning",
        "ipv6: false",
        "unified-delay: true",
        "tcp-concurrent: true",
        "external-controller: 127.0.0.1:9090",
        "profile:",
        "  store-selected: true",
        "  store-fake-ip: true",
        "dns:",
        "  enable: true",
        "  ipv6: false",
        "  enhanced-mode: fake-ip",
        "  fake-ip-range: 198.18.0.1/16",
        "  nameserver:",
        '    - "1.1.1.1"',
        '    - "8.8.8.8"',
        "",
        "proxies:",
    ]
    for p in proxies:
        out.append("  - " + yval(p))
    out.append("")
    out.append("proxy-groups:")
    out.append("  - name: %s" % yval(tag))
    out.append("    type: select")
    out.append("    proxies: " + yval(["Auto", "Fallback"] + protos + ["DIRECT"]))
    for gname, gtype in (("Auto", "url-test"), ("Fallback", "fallback")):
        out.append("  - name: %s" % yval(gname))
        out.append("    type: %s" % gtype)
        out.append("    include-all-proxies: true")
        out.append("    filter: %s" % yval("^" + tag + "-"))
        out.append('    url: "http://www.gstatic.com/generate_204"')
        out.append("    interval: 600")
        if gtype == "url-test":
            out.append("    tolerance: 100")
        out.append("    lazy: true")
    for p in protos:
        out.append("  - name: %s" % yval(p))
        out.append("    type: select")
        out.append("    include-all-proxies: true")
        out.append("    filter: %s" % yval("-" + p + "$"))
    out.append("")
    out.append("rules:")
    for r in RULES:
        out.append("  - " + yval(r.replace("__TAG__", tag)))
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(out) + "\n")
    return os.path.getsize(path)


def main():
    ap = argparse.ArgumentParser(description="Alive proxy URIs -> Clash Verge YAML profiles")
    ap.add_argument("input", nargs="?", default="tagged/alive_sword-saint69.txt")
    ap.add_argument("--out", default="tagged", help="output directory")
    ap.add_argument("--tag", default="Sword-saint69", help="brand tag used in names + group")
    ap.add_argument("--lite", type=int, default=500, help="proxy count for the lite profile (0 = skip)")
    args = ap.parse_args()

    with open(args.input, encoding="utf-8", errors="ignore") as f:
        raw_lines = [norm(line) for line in f if line.strip()]

    proxies = []
    seen = set()
    per_proto = {}
    unusable = 0
    dupes = 0
    for line in raw_lines:
        if "://" not in line:
            unusable += 1
            continue
        scheme = line.split("://", 1)[0].lower()
        parser = PARSERS.get(scheme)
        if not parser:
            unusable += 1
            continue
        try:
            d = parser(line)
        except Exception:
            d = None
        if not d:
            unusable += 1
            continue
        key = json.dumps(d, sort_keys=True)
        if key in seen:
            dupes += 1
            continue
        seen.add(key)
        if not (1 <= as_int(d.get("port")) <= 65535):
            unusable += 1
            continue
        proto = d["type"]
        d = {"name": "%s-%04d-%s" % (args.tag, len(proxies) + 1, proto), **d}
        proxies.append(d)
        per_proto[proto] = per_proto.get(proto, 0) + 1

    if not proxies:
        print("vpn_to_clash: no proxies parsed from %s" % args.input, file=sys.stderr)
        return 1

    os.makedirs(args.out, exist_ok=True)
    protos = [p for p, _ in sorted(per_proto.items(), key=lambda kv: -kv[1])]
    slug = args.tag.lower()

    full_path = os.path.join(args.out, "clash_verge_%s.yaml" % slug)
    size_full = write_profile(full_path, proxies, protos, args.tag, unusable, dupes, os.path.basename(args.input))

    lite_path = None
    size_lite = 0
    lite_count = 0
    if args.lite > 0 and len(proxies) > 0:
        lite_proxies = [dict(p) for p in sample_evenly(proxies, args.lite)]
        for i, p in enumerate(lite_proxies, 1):
            p["name"] = "%s-%04d-%s" % (args.tag, i, p["type"])
        # names are index-dense in both files, so group filters stay identical
        lite_count = len(lite_proxies)
        lite_path = os.path.join(args.out, "clash_verge_lite_%s.yaml" % slug)
        size_lite = write_profile(lite_path, lite_proxies, protos, args.tag, unusable, dupes, os.path.basename(args.input))

    print("parsed %d proxies (%s)" % (len(proxies), ", ".join("%s:%d" % kv for kv in sorted(per_proto.items(), key=lambda kv: -kv[1]))))
    if STATS["mislabeled_ss_vless"]:
        print("reparsed %d mislabeled ss:// links as vless" % STATS["mislabeled_ss_vless"])
    for key, label in (
        ("bad_uuid", "non-uuid credentials"),
        ("bad_pbk", "invalid reality keys"),
        ("bad_encryption", "unsupported vless encryption values"),
    ):
        if STATS[key]:
            print("dropped %d %s" % (STATS[key], label))
    print("dropped: %d unusable, %d semantic duplicates" % (unusable, dupes))
    print("wrote %s (%.1f KB)" % (full_path, size_full / 1024))
    if lite_path:
        print("wrote %s (%.1f KB, %d proxies)" % (lite_path, size_lite / 1024, lite_count))
    return 0


if __name__ == "__main__":
    sys.exit(main())
