function FindProxyForURL(url, host)
{
    url  = url.toLowerCase();
    host = host.toLowerCase();

    if (isInNet(dnsResolve(host), "10.0.0.0", "255.0.0.0")
      || isInNet(dnsResolve(host), "172.16.0.0",  "255.240.0.0")
      || isInNet(dnsResolve(host), "192.168.0.0", "255.255.0.0")
      || isInNet(dnsResolve(host), "127.0.0.0", "255.255.255.0")
    ) {
      return "DIRECT";
    }

    if (shExpMatch(url,"*bili*")
      || shExpMatch(url,"*bilibili*")
      || shExpMatch(url,"*bilivideo*")
      || shExpMatch(url,"*akamaized*")
      || shExpMatch(url,"*hdslb*")
      || shExpMatch(url,"*szbdyd*")
      || shExpMatch(url,"*ytimg*")
      || shExpMatch(url,"*ip*")
      || shExpMatch(url,"*acgvideo*")
    ) {
       return "SOCKS5 49.4.89.129:8888; SOCKS4 49.4.89.129:8888; SOCKS 49.4.89.129";
    }
    return 'DIRECT';
}
